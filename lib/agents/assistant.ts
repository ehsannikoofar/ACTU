// Agent 2 — Clinical Decision Assistant.
// 1) Wound photo → structured findings (Claude vision).
// 2) Chart research through MCP tools (Epic FHIR bridge) → closure method + summary (Claude tool loop).
// 3) Glycemia flag and Suitability Index → deterministic code (lib/pathway), never the model.
// The APN makes every decision; this module only prepares the evidence.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { type Enrollment, procedureDate, visitAt } from "@/lib/demo/cohort";
import type { FhirSource } from "@/lib/epic/fhir";
import { connectMcp } from "@/lib/mcp/client";
import { assessGlycemia, type ConditionLite, type GlycemiaResult, type ObservationLite } from "@/lib/pathway/glycemia";
import { computeSuitability, type PhotoFindings, type SuitabilityResult } from "@/lib/pathway/suitability";
import { type EnrollmentState, PHOTO_DIR } from "@/lib/store";
import { BASE, claude } from "./claude";

// ---------- Schemas (structured outputs) ----------
const Finding = z.object({
  present: z.boolean(),
  confidence: z.number().describe("0.0–1.0 confidence in the present/absent judgement"),
  evidence: z.string().describe("What in the image supports this, in one short sentence"),
});
export const PhotoSchema = z.object({
  usable: z.boolean().describe("false if the incision is not visible, image too dark/blurred, or not a wound photo"),
  usability_note: z.string(),
  findings: z.object({
    incision_opening: Finding,
    drainage: Finding,
    spreading_redness: Finding,
    protruding_suture_or_wire: Finding,
  }),
  sutures_visible: z.boolean().describe("Non-absorbable/retention sutures visibly present on the skin"),
  description: z.string().describe("Neutral 1–2 sentence description of the incision for the APN"),
});
export type PhotoAnalysis = z.infer<typeof PhotoSchema>;

export const ChartSchema = z.object({
  closure_method: z.enum(["absorbable", "retention_or_stay_sutures", "unknown"]),
  closure_evidence: z.string().describe("Short verbatim quote from the OR note supporting the closure method, or why unknown"),
  or_note_found: z.boolean(),
  or_note_source: z.string().describe("Where the OR note came from (the tool's 'source' field)"),
  procedure_summary: z.string(),
  relevant_history: z.array(z.string()).describe("Conditions relevant to wound healing or cardiac follow-up, each a short phrase"),
  medications_of_note: z.array(z.string()).describe("e.g. anticoagulants, steroids, insulin — short phrases; empty if none"),
  data_gaps: z.array(z.string()),
  summary_for_apn: z.string().describe("3–5 neutral sentences summarising photo, questionnaire and chart for the APN. No final decision."),
});
export type ChartFindings = z.infer<typeof ChartSchema>;

export interface TraceEntry { tool: string; ok: boolean; source: string | null; ms: number }

export interface AssistantResult {
  ranAt: string;
  model: string;
  mcpTransport: string;
  photo: PhotoAnalysis | null;
  chart: ChartFindings;
  glycemia: GlycemiaResult;
  suitability: SuitabilityResult;
  trace: TraceEntry[];
}

export type AssistantEvent =
  | { type: "step"; step: "photo" | "chart" | "glycemia" | "index"; status: "start" | "done" | "skipped" }
  | { type: "tool"; tool: string; ok: boolean; source: string | null; ms: number }
  | { type: "result"; result: AssistantResult }
  | { type: "error"; message: string };

// ---------- Prompts ----------
const PHOTO_SYSTEM = `You assist an advanced practice nurse (APN) at a cardiac triage unit. You review ONE photo of a healing median sternotomy incision, taken about two weeks after a sternal wire-related procedure.
Report only what is visible. For each finding give present/absent, your confidence (0.0–1.0) in that judgement, and brief visual evidence.
- incision_opening: any gap, separation or open area along the incision.
- drainage: visible fluid, crusted exudate, or discharge.
- spreading_redness: erythema extending beyond the immediate incision margins.
- protruding_suture_or_wire: suture ends or wire visibly protruding through the skin.
Images may carry a "SYNTHETIC" watermark — they are demonstration images; ignore the watermark itself.
You do not diagnose and you do not recommend a visit type.`;

const CHART_SYSTEM = `You are the Clinical Decision Assistant for the Acute Cardiac Triage Unit (ACTU) virtual follow-up pathway. You prepare evidence for an APN, who makes every decision.
Use the tools to research the patient's Epic chart. Always call find_operative_note and determine the skin-closure method strictly from the OR note text:
- "retention_or_stay_sutures" if the note documents retention, stay, or non-absorbable skin sutures that need removal;
- "absorbable" if closure is documented as absorbable/subcuticular/glue with no sutures to remove;
- "unknown" if the note is missing or unclear.
Also review conditions, medications, glycemic labs and vitals for factors relevant to wound healing. Patient characteristics are context only — they are never a reason to exclude virtual care.
Be concise and factual. Cite which tool/source each fact came from in your summary when helpful. Do not recommend a final visit type; the APN decides.
When you have enough information, reply with the requested JSON only.`;

function loadPhoto(state: EnrollmentState): { data: string; media: "image/png" | "image/jpeg" } | null {
  if (!state.photo) return null;
  const file = path.join(PHOTO_DIR, path.basename(state.photo.file));
  if (!fs.existsSync(file)) return null;
  const media = file.endsWith(".jpg") || file.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return { data: fs.readFileSync(file).toString("base64"), media };
}

async function analysePhoto(img: { data: string; media: "image/png" | "image/jpeg" }): Promise<PhotoAnalysis> {
  const res = await claude().beta.messages.parse({
    ...BASE,
    max_tokens: 4000,
    output_config: { effort: "medium", format: betaZodOutputFormat(PhotoSchema) },
    system: PHOTO_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: img.media, data: img.data } },
          { type: "text", text: "Assess this incision photo." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined to analyse this image.");
  if (!res.parsed_output) throw new Error("Photo analysis returned no structured output.");
  const p = res.parsed_output;
  for (const f of Object.values(p.findings)) f.confidence = Math.min(1, Math.max(0, f.confidence));
  return p;
}

export async function runAssistant(params: {
  enrollment: Enrollment;
  state: EnrollmentState;
  demoStartedAt: string;
  fhir: FhirSource;
  bearer: string | null;
  now: Date;
  emit: (e: AssistantEvent) => void;
}): Promise<AssistantResult> {
  const { enrollment, state, fhir, emit, now } = params;
  const trace: TraceEntry[] = [];

  // 1. Photo
  let photo: PhotoAnalysis | null = null;
  const img = loadPhoto(state);
  if (img) {
    emit({ type: "step", step: "photo", status: "start" });
    photo = await analysePhoto(img);
    emit({ type: "step", step: "photo", status: "done" });
  } else {
    emit({ type: "step", step: "photo", status: "skipped" });
  }

  // 2. Chart research via MCP
  emit({ type: "step", step: "chart", status: "start" });
  const mcp = await connectMcp(
    {
      fhir,
      enrollment,
      procedureDate: procedureDate(enrollment, params.demoStartedAt),
      visitAt: visitAt(params.demoStartedAt),
      orNoteEpicId: state.orNote?.target === "epic" ? state.orNote.epicId ?? null : null,
      answers: state.answers,
      answersSource: state.answersSource ?? null,
      now,
    },
    params.bearer,
  );
  let chart: ChartFindings;
  try {
    const { tools: mcpTools } = await mcp.client.listTools();
    const tools: Anthropic.Beta.BetaTool[] = mcpTools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      input_schema: t.inputSchema as Anthropic.Beta.BetaTool.InputSchema,
    }));
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      {
        role: "user",
        content: `Prepare the pre-visit review for this patient.
Questionnaire answers (collected by the outreach agent, source: ${state.answersSource ?? "none"}): ${JSON.stringify(state.answers ?? "not completed")}
Wound photo findings (from the photo review step): ${JSON.stringify(photo ?? "no photo received")}`,
      },
    ];
    let parsed: ChartFindings | null = null;
    for (let turn = 0; turn < 12 && !parsed; turn++) {
      const res = await claude().beta.messages.parse({
        ...BASE,
        max_tokens: 16000,
        output_config: { effort: "medium", format: betaZodOutputFormat(ChartSchema) },
        system: CHART_SYSTEM,
        tools,
        messages,
      });
      if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
      if (res.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: res.content });
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const block of res.content) {
          if (block.type !== "tool_use") continue;
          const t0 = Date.now();
          const out = await mcp.client.callTool({ name: block.name, arguments: (block.input ?? {}) as Record<string, unknown> });
          const textOut = (out.content as { type: string; text?: string }[]).map((c) => c.text ?? "").join("\n");
          const source = textOut.match(/"source":\s*"([^"]+)"/)?.[1] ?? null;
          const entry = { tool: block.name, ok: !out.isError, source, ms: Date.now() - t0 };
          trace.push(entry);
          emit({ type: "tool", ...entry });
          results.push({ type: "tool_result", tool_use_id: block.id, content: textOut, is_error: Boolean(out.isError) });
        }
        messages.push({ role: "user", content: results });
        continue;
      }
      if (res.stop_reason === "max_tokens") throw new Error("Chart review hit the output limit.");
      parsed = res.parsed_output ?? null;
      if (!parsed) throw new Error("Chart review returned no structured output.");
    }
    if (!parsed) throw new Error("Chart review did not finish within the tool-call limit.");
    chart = parsed;
  } finally {
    await mcp.close();
  }
  emit({ type: "step", step: "chart", status: "done" });

  // 3. Glycemia flag — deterministic, straight from Epic data (not from the model)
  emit({ type: "step", step: "glycemia", status: "start" });
  const [conditions, labs] = await Promise.all([
    fhir.search("Condition", { patient: enrollment.fhirPatientId }).catch(() => []),
    fhir.search("Observation", { patient: enrollment.fhirPatientId, category: "laboratory" }).catch(() => []),
  ]);
  const glycemia = assessGlycemia(conditions as ConditionLite[], labs as ObservationLite[], now);
  emit({ type: "step", step: "glycemia", status: "done" });

  // 4. Suitability Index — deterministic
  emit({ type: "step", step: "index", status: "start" });
  const photoFindings: PhotoFindings | null = photo ? { usable: photo.usable, findings: photo.findings } : null;
  const suitability = computeSuitability({
    answers: state.answers ?? {},
    photo: photoFindings,
    closure: chart.closure_method,
    orNoteFound: chart.or_note_found,
    glycemia,
  });
  emit({ type: "step", step: "index", status: "done" });

  const result: AssistantResult = {
    ranAt: now.toISOString(),
    model: BASE.model,
    mcpTransport: mcp.transportLabel,
    photo,
    chart,
    glycemia,
    suitability,
    trace,
  };
  emit({ type: "result", result });
  return result;
}
