import { NextResponse } from "next/server";
import { type AssistantEvent, runAssistant } from "@/lib/agents/assistant";
import { describeApiError } from "@/lib/agents/claude";
import { audit } from "@/lib/audit";
import { now } from "@/lib/clock";
import { enrollmentOr404, requireClinician, sameOrigin } from "@/lib/guards";
import { enrollmentState, getState, update } from "@/lib/store";

export const maxDuration = 300;

// Runs Agent 2 and streams progress as Server-Sent Events.
export async function POST(req: Request, ctx: RouteContext<"/api/patients/[id]/assistant">) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "cross-origin" }, { status: 403 });
  const e = enrollmentOr404((await ctx.params).id);
  if (!e.ok) return e.res;
  const g = await requireClinician();
  if (!g.ok) return g.res;
  const { fhir, actor, session } = g.value;
  const enrollment = e.value;
  const state = enrollmentState(enrollment.id);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (ev: AssistantEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      audit({ actor, action: "assistant.run.start", enrollmentId: enrollment.id });
      try {
        const result = await runAssistant({
          enrollment,
          state,
          demoStartedAt: getState().demo.startedAt,
          fhir,
          bearer: session?.clinician?.accessToken ?? null,
          now: now(),
          emit,
        });
        update(() => {
          enrollmentState(enrollment.id).assistant = result;
        });
        audit({ actor: { kind: "agent", name: "decision-assistant" }, action: "assistant.run.done", enrollmentId: enrollment.id, detail: { score: result.suitability.score, apnAttention: result.suitability.apnAttention, tools: result.trace.length } });
      } catch (err) {
        const message = describeApiError(err);
        audit({ actor: { kind: "agent", name: "decision-assistant" }, action: "assistant.run.failed", enrollmentId: enrollment.id });
        emit({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" } });
}
