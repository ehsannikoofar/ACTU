import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { describeApiError } from "@/lib/agents/claude";
import { nextTurn, openingLine } from "@/lib/agents/outreach-call";
import { audit } from "@/lib/audit";
import { now } from "@/lib/clock";
import { visitAt } from "@/lib/demo/cohort";
import { enrollmentOr404, requireClinician, sameOrigin } from "@/lib/guards";
import { formatDateTime, isLang } from "@/lib/i18n";
import { isComplete } from "@/lib/pathway/questionnaire";
import { recordScreening, savePhotoFromDataUrl } from "@/lib/service";
import { enrollmentState, getState, update } from "@/lib/store";

export const maxDuration = 60;

// Agent 1 (outreach) — V−24h call. The agent acts on behalf of the ACTU, so the presenter's
// clinician session authorises it and any Epic write uses that session.
export async function POST(req: Request, ctx: RouteContext<"/api/call/[id]">) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin" }, { status: 403 });
  const e = enrollmentOr404((await ctx.params).id);
  if (!e.ok) return e.res;
  const g = await requireClinician();
  if (!g.ok) return g.res;
  const enr = e.value;
  const body = (await req.json()) as { action: string; text?: string; lang?: string; image?: string; video?: boolean };
  const st = enrollmentState(enr.id);
  const agent = { kind: "agent" as const, name: "outreach" as const };
  const at = () => now().toISOString();

  if (body.action === "start") {
    const lang = isLang(body.lang) ? body.lang : "en";
    const say = openingLine(lang, formatDateTime(visitAt(getState().demo.startedAt), lang));
    update(() => {
      st.call = { id: crypto.randomUUID(), turns: [{ role: "agent", text: say, at: at() }], video: null, lang, draft: {}, photoCaptured: false, ended: false };
      st.events.push({ type: "call_started", at: at(), channel: "call" });
    });
    audit({ actor: agent, action: "call.started", enrollmentId: enr.id, detail: { lang } });
    return NextResponse.json({ say, call: st.call });
  }

  if (body.action === "unreached") {
    update(() => {
      if (st.call) st.call.ended = true;
      st.events.push({ type: "call_unreached", at: at(), channel: "call" });
    });
    audit({ actor: agent, action: "call.unreached", enrollmentId: enr.id });
    return NextResponse.json({ ok: true });
  }

  const call = st.call;
  if (!call || call.ended) return NextResponse.json({ error: "No active call" }, { status: 409 });

  if (body.action === "photo") {
    try {
      const file = savePhotoFromDataUrl(enr.id, String(body.image ?? ""));
      update(() => {
        st.photo = { file, source: "call", at: at() };
        call.photoCaptured = true;
        call.turns.push({ role: "patient", text: "[photo captured]", at: at() });
      });
      audit({ actor: agent, action: "call.photo_captured", enrollmentId: enr.id });
    } catch {
      return NextResponse.json({ error: "Could not save the photo" }, { status: 400 });
    }
  } else if (body.action === "say") {
    const text = String(body.text ?? "").trim().slice(0, 1000);
    if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
    update(() => call.turns.push({ role: "patient", text, at: at() }));
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  try {
    const turn = await nextTurn(call.lang, call.turns, call.draft, call.photoCaptured);
    update(() => {
      for (const u of turn.updates) call.draft[u.item] = u.answer;
      if (turn.video_consent !== "unknown") call.video = turn.video_consent === "yes";
      call.turns.push({ role: "agent", text: turn.say, at: at() });
    });
    let finished: "completed" | "unreached" | null = null;
    if (turn.patient_unavailable && turn.done) {
      update(() => {
        call.ended = true;
        st.events.push({ type: "call_unreached", at: at(), channel: "call" });
      });
      audit({ actor: agent, action: "call.declined", enrollmentId: enr.id });
      finished = "unreached";
    } else if (turn.done && isComplete(call.draft)) {
      update(() => {
        call.ended = true;
      });
      await recordScreening({ enrollmentId: enr.id, answers: { ...call.draft }, source: "call", actor: agent });
      audit({ actor: agent, action: "call.completed", enrollmentId: enr.id, detail: { video: call.video === true, photo: call.photoCaptured } });
      finished = "completed";
    }
    return NextResponse.json({ say: turn.say, requestPhoto: turn.request_photo_capture, video: call.video, draft: call.draft, finished });
  } catch (err) {
    return NextResponse.json({ error: describeApiError(err) }, { status: 502 });
  }
}
