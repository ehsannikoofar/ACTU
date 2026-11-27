// Text of the single clinical note filed to Epic when the APN records the decision (Option A).
// It carries the patient's 10 screening answers, the assistant's findings and the APN decision.
// Why a note and not a QuestionnaireResponse: Epic's QuestionnaireResponse.Create only accepts
// answers to patient-entered questionnaires built in Epic and assigned to an appointment or
// questionnaire series, and is not offered to patient-facing apps (Epic API spec, id 10023).
// Pure function (no server imports) so it can be unit-tested.
import { ITEMS, type Answers } from "@/lib/pathway/questionnaire";
import type { Flag, PhotoFindingKey, RouteOption, SuitabilityResult } from "@/lib/pathway/suitability";

export interface DecisionNoteInput {
  route: RouteOption;
  apnNote: string;
  decidedAt: string;
  answers: Answers | null;
  answersSource: "mychart" | "call" | null;
  photoSource: "mychart" | "call" | null;
  assistant: {
    suitability: Pick<SuitabilityResult, "score" | "components" | "flags" | "options">;
    photo: { usable: boolean; description: string; findings: Record<PhotoFindingKey, { present: boolean; confidence: number }> } | null;
    chart: { closure_method: string; closure_evidence: string; summary_for_apn: string };
  } | null;
  /** English UI dictionary (labels for questions, routes, findings). */
  labels: Record<string, string>;
}

const SOURCE: Record<"mychart" | "call", string> = { mychart: "MyChart (patient self-report)", call: "outreach agent call" };

function flagLine(f: Flag, L: Record<string, string>): string {
  switch (f.kind) {
    case "red_flag_questionnaire":
      return `RED FLAG (patient-reported): ${f.items.map((i) => L[`qshort.${i}`] ?? i).join(", ")}`;
    case "red_flag_photo":
      return `RED FLAG (photo review): ${f.findings.map((k) => L[`finding.${k}`] ?? k).join(", ")}`;
    case "glycemia":
      return `ATTENTION (glycemic control): ${f.reasons.map((r) => r.kind).join(", ")}`;
    case "questionnaire_incomplete":
      return "DATA GAP: questionnaire incomplete";
    case "photo_missing_or_unusable":
      return "DATA GAP: no usable wound photo";
    case "closure_unknown":
      return "DATA GAP: closure method not found in OR note";
  }
}

export function decisionNoteText(i: DecisionNoteInput): string {
  const L = i.labels;
  const lines: string[] = [];
  lines.push("ACTU PRE-VISIT SCREENING — APN DECISION");
  lines.push("DEMONSTRATION ONLY — synthetic data, not a real patient.");
  lines.push("");
  lines.push(`Decision: ${L[`route.${i.route}`] ?? i.route}`);
  lines.push(`Decided: ${i.decidedAt}`);
  if (i.apnNote.trim()) lines.push(`APN note: ${i.apnNote.trim()}`);

  lines.push("");
  lines.push(`PRE-VISIT QUESTIONNAIRE${i.answersSource ? ` (via ${SOURCE[i.answersSource]})` : ""}`);
  if (!i.answers) {
    lines.push("Not completed.");
  } else {
    for (const sec of ["wound", "symptoms", "patient"] as const) {
      lines.push(L[`section.${sec}`] ?? sec);
      for (const item of ITEMS.filter((x) => x.section === sec)) {
        const a = i.answers[item.id];
        const concern = a !== undefined && a === item.concernWhen;
        lines.push(`  - ${L[`q.${item.id}`] ?? item.id} ${a ? a.toUpperCase() : "UNANSWERED"}${concern ? (sec === "patient" ? "  [barrier]" : "  [red flag]") : ""}`);
      }
    }
  }

  lines.push("");
  lines.push(`WOUND PHOTO: ${i.photoSource ? `received via ${SOURCE[i.photoSource]}` : "not received"}`);

  const a = i.assistant;
  lines.push("");
  if (!a) {
    lines.push("CLINICAL DECISION ASSISTANT: not run.");
  } else {
    lines.push("CLINICAL DECISION ASSISTANT (AI — recommends only; the APN decides)");
    lines.push(`Virtual-care Suitability Index (illustrative, not validated): ${a.suitability.score}/100`);
    for (const c of a.suitability.components) lines.push(`  - ${L[`comp.${c.key}`] ?? c.key}: ${c.points}/${c.max}`);
    lines.push(`Assistant suggestion: ${L[`route.${a.suitability.options[0]}`] ?? a.suitability.options[0]}`);
    lines.push("Flags:");
    if (a.suitability.flags.length === 0) lines.push("  - none");
    for (const f of a.suitability.flags) lines.push(`  - ${flagLine(f, L)}`);
    if (a.photo) {
      lines.push(`Photo review: ${a.photo.usable ? "usable" : "NOT usable"} — ${a.photo.description}`);
      for (const [k, f] of Object.entries(a.photo.findings)) {
        lines.push(`  - ${L[`finding.${k}`] ?? k}: ${f.present ? "present" : "absent"} (${Math.round(f.confidence * 100)}%)`);
      }
    }
    lines.push(`Closure method (from OR note): ${L[`closure.${a.chart.closure_method}`] ?? a.chart.closure_method} — "${a.chart.closure_evidence}"`);
    lines.push(`Chart summary: ${a.chart.summary_for_apn}`);
  }
  lines.push("");
  lines.push("AI recommends; the APN decides.");
  return lines.join("\n");
}
