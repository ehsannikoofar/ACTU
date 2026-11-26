// Agent 1 timeline: V−72h MyChart invite → V−48h reminder → V−24h agent call.
// Pure state machine: given the visit time, recorded events and "now", returns the stage
// and the actions that are due. The scheduler applies the actions and records events.
import { OUTREACH_HOURS } from "./clinical-config";

export type OutreachEventType =
  | "invite_sent"
  | "reminder_sent"
  | "call_started"
  | "call_completed"
  | "call_unreached"
  | "questionnaire_submitted";

export interface OutreachEvent { type: OutreachEventType; at: string; channel?: "mychart" | "call" }

export type Stage =
  | "scheduled" // before V−72h
  | "awaiting_call" // no MyChart account: nothing to send until the call window
  | "invited"
  | "reminded"
  | "call_due"
  | "in_call"
  | "completed"
  | "unreached"; // call attempted, no answer/declined → ACTU RN follow-up

export type DueAction = "send_invite" | "send_reminder";

export interface OutreachStatus {
  stage: Stage;
  dueActions: DueAction[];
  overdue: boolean; // visit time reached without a completed screening
  next: { label: "invite" | "reminder" | "call" | "visit"; at: string } | null;
}

const H = 3_600_000;

export function outreachStatus(
  visitAt: string,
  events: OutreachEvent[],
  hasMyChart: boolean,
  now: Date,
): OutreachStatus {
  const v = Date.parse(visitAt);
  const t = now.getTime();
  const has = (type: OutreachEventType) => events.some((e) => e.type === type);
  const inviteAt = v - OUTREACH_HOURS.invite * H;
  const reminderAt = v - OUTREACH_HOURS.reminder * H;
  const callAt = v - OUTREACH_HOURS.call * H;
  const iso = (ms: number) => new Date(ms).toISOString();

  if (has("questionnaire_submitted") || has("call_completed")) {
    return { stage: "completed", dueActions: [], overdue: false, next: { label: "visit", at: visitAt } };
  }
  const overdue = t >= v;
  if (has("call_unreached")) {
    return { stage: "unreached", dueActions: [], overdue, next: { label: "visit", at: visitAt } };
  }
  if (has("call_started")) {
    return { stage: "in_call", dueActions: [], overdue, next: null };
  }

  const dueActions: DueAction[] = [];
  if (hasMyChart && t >= inviteAt && !has("invite_sent")) dueActions.push("send_invite");
  // A reminder only follows an invite (the invite is sent in the same tick if both are due).
  if (hasMyChart && t >= reminderAt && t < callAt && !has("reminder_sent")) dueActions.push("send_reminder");

  if (t >= callAt) return { stage: "call_due", dueActions, overdue, next: { label: "visit", at: visitAt } };
  if (t < inviteAt) return { stage: "scheduled", dueActions, overdue, next: { label: hasMyChart ? "invite" : "call", at: iso(hasMyChart ? inviteAt : callAt) } };
  if (!hasMyChart) return { stage: "awaiting_call", dueActions, overdue, next: { label: "call", at: iso(callAt) } };
  if (t >= reminderAt) return { stage: "reminded", dueActions, overdue, next: { label: "call", at: iso(callAt) } };
  return { stage: "invited", dueActions, overdue, next: { label: "reminder", at: iso(reminderAt) } };
}

/** Worklist ordering: APN attention (red flags) first, then overdue / needs action, then by visit time. */
export function worklistPriority(stage: Stage, apnAttention: boolean, awaitingDecision: boolean, overdue: boolean): number {
  if (apnAttention && awaitingDecision) return 0;
  if (overdue || stage === "unreached") return 1;
  if (stage === "call_due" || stage === "in_call") return 2;
  if (awaitingDecision) return 3;
  return 4;
}
