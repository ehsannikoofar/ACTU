import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { now } from "@/lib/clock";
import { DICTS } from "@/lib/i18n";
import { decisionNoteText } from "@/lib/epic/decision-note";
import { clinicalNote } from "@/lib/epic/resources";
import { writeToEpic } from "@/lib/epic/writer";
import { enrollmentOr404, requireClinician, sameOrigin } from "@/lib/guards";
import type { AssistantResult } from "@/lib/agents/assistant";
import type { RouteOption } from "@/lib/pathway/suitability";
import { latestEncounterId } from "@/lib/service";
import { enrollmentState, update } from "@/lib/store";

const ROUTES: RouteOption[] = ["virtual_visit", "phone_visit_or_local_support", "local_suture_removal_plus_apn_check", "in_person_actu", "phone_advice"];

// The APN's decision. The assistant never applies a route; only this clinician action does.
// Files ONE clinical note to Epic with the screening answers, the assistant's findings and the decision.
export async function POST(req: Request, ctx: RouteContext<"/api/patients/[id]/decision">) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin" }, { status: 403 });
  const e = enrollmentOr404((await ctx.params).id);
  if (!e.ok) return e.res;
  const g = await requireClinician();
  if (!g.ok) return g.res;
  const body = (await req.json()) as { route?: string; note?: string };
  if (!ROUTES.includes(body.route as RouteOption)) return NextResponse.json({ error: "Choose a follow-up option." }, { status: 400 });
  const route = body.route as RouteOption;
  const note = String(body.note ?? "").slice(0, 2000);
  const at = now().toISOString();
  const st = enrollmentState(e.value.id);
  const a = st.assistant as AssistantResult | null;
  const suggested = a?.suitability.options[0] ?? null;

  update(() => {
    st.decision = { route, note, by: g.value.actor.kind === "clinician" ? g.value.actor.id : "unknown", at };
  });
  audit({ actor: g.value.actor, action: "decision.recorded", enrollmentId: e.value.id, demoAt: at, detail: { route, followedSuggestion: suggested === route, score: a?.suitability.score ?? null } });

  const text = decisionNoteText({
    route,
    apnNote: note,
    decidedAt: at,
    answers: st.answers,
    answersSource: st.answersSource ?? null,
    photoSource: st.photo?.source ?? null,
    assistant: a,
    labels: DICTS.en,
  });
  const encounterId = await latestEncounterId(g.value.fhir, e.value.fhirPatientId);
  const rec = await writeToEpic(g.value.fhir, e.value.id, g.value.actor, clinicalNote(e.value.fhirPatientId, "ACTU pre-visit screening and APN decision", text, at, encounterId));
  return NextResponse.json({ ok: true, write: rec });
}
