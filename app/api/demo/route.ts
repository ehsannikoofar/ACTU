import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { now, setNow } from "@/lib/clock";
import { COHORT, visitAt } from "@/lib/demo/cohort";
import { requireClinician, sameOrigin } from "@/lib/guards";
import { seedOrNote, syncOutreach } from "@/lib/service";
import { getState, resetState } from "@/lib/store";

// Demo controls: fast-forward the clock, reset, file synthetic OR notes to the sandbox.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin" }, { status: 403 });
  const body = (await req.json()) as { action: string; hoursBeforeVisit?: number };
  if (body.action === "reset") {
    resetState();
    audit({ actor: { kind: "system" }, action: "demo.reset" });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "jump" && typeof body.hoursBeforeVisit === "number" && Math.abs(body.hoursBeforeVisit) <= 200) {
    const v = Date.parse(visitAt(getState().demo.startedAt));
    const target = new Date(v - body.hoursBeforeVisit * 3_600_000 + 60_000);
    if (target.getTime() < now().getTime()) return NextResponse.json({ error: "The demo clock only moves forward. Reset the demo to start over." }, { status: 409 });
    setNow(target);
    syncOutreach();
    audit({ actor: { kind: "system" }, action: "demo.clock.jump", detail: { hoursBeforeVisit: body.hoursBeforeVisit } });
    return NextResponse.json({ ok: true, now: now().toISOString() });
  }
  if (body.action === "seed-or-notes") {
    const g = await requireClinician();
    if (!g.ok) return g.res;
    const results: Record<string, string> = {};
    for (const e of COHORT) results[e.id] = await seedOrNote(e.id);
    return NextResponse.json({ ok: true, results });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
