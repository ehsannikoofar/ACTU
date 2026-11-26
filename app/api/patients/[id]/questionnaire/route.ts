import { NextResponse } from "next/server";
import { enrollmentOr404, requirePatient, sameOrigin } from "@/lib/guards";
import { ITEM_IDS, type Answers } from "@/lib/pathway/questionnaire";
import { recordScreening, savePhotoFromSynthetic } from "@/lib/service";
import { enrollmentState, update } from "@/lib/store";
import { now } from "@/lib/clock";

// MyChart-style self-report: answers + wound photo, submitted by the signed-in patient.
export async function POST(req: Request, ctx: RouteContext<"/api/patients/[id]/questionnaire">) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin" }, { status: 403 });
  const e = enrollmentOr404((await ctx.params).id);
  if (!e.ok) return e.res;
  const g = await requirePatient(e.value);
  if (!g.ok) return g.res;
  const body = (await req.json()) as { answers?: Record<string, unknown>; syntheticPhoto?: string | null };
  const answers: Answers = {};
  for (const id of ITEM_IDS) {
    const v = body.answers?.[id];
    if (v === "yes" || v === "no") answers[id] = v;
  }
  if (Object.keys(answers).length !== ITEM_IDS.length) return NextResponse.json({ error: "Please answer every question." }, { status: 400 });
  if (body.syntheticPhoto) {
    const file = savePhotoFromSynthetic(e.value.id, body.syntheticPhoto);
    update(() => {
      enrollmentState(e.value.id).photo = { file, source: "mychart", at: now().toISOString() };
    });
  }
  await recordScreening({ enrollmentId: e.value.id, answers, source: "mychart", fhir: g.value.fhir, actor: { kind: "patient", enrollmentId: e.value.id } });
  const st = enrollmentState(e.value.id);
  return NextResponse.json({ ok: true, write: st.writes.at(-1) ?? null });
}
