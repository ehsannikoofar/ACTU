// "Epic FHIR MCP bridge": a read-only MCP server exposing Epic FHIR R4 reads as tools.
// Stand-in for Epic's announced incoming MCP connectors ("read data available through
// USCDI v5 FHIR R4 APIs", targeted Q1 2027). Each server instance is bound to ONE patient,
// so the agent cannot look up anyone else.
import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Enrollment } from "@/lib/demo/cohort";
import { type FhirSource, type Resource, patientName } from "@/lib/epic/fhir";
import { LOINC } from "@/lib/pathway/clinical-config";
import { ITEMS, type Answers } from "@/lib/pathway/questionnaire";

export const OR_NOTE_MARKER = "SYNTHETIC OPERATIVE NOTE";

export interface BridgeContext {
  fhir: FhirSource;
  enrollment: Enrollment;
  procedureDate: string;
  visitAt: string;
  orNoteEpicId: string | null; // DocumentReference id if the synthetic note was filed to the sandbox
  answers: Answers | null;
  answersSource: string | null;
  now: Date;
}

type ToolText = { content: { type: "text"; text: string }[]; isError?: boolean };
const json = (v: unknown): ToolText => ({ content: [{ type: "text", text: JSON.stringify(v, null, 1) }] });
const fail = (msg: string): ToolText => ({ content: [{ type: "text", text: msg }], isError: true });

function text(c?: { text?: string; coding?: { display?: string; code?: string; system?: string }[] }): string {
  return c?.text ?? c?.coding?.map((x) => x.display ?? x.code).filter(Boolean).join(" / ") ?? "";
}
function codes(c?: { coding?: { code?: string; system?: string }[] }): string[] {
  return (c?.coding ?? []).map((x) => x.code ?? "").filter(Boolean);
}
async function safe<T>(fn: () => Promise<T>): Promise<T | ToolText> {
  try {
    return await fn();
  } catch (e) {
    return fail(`FHIR request failed: ${e instanceof Error ? e.message : "unknown error"}`);
  }
}
function isToolText(v: unknown): v is ToolText {
  return typeof v === "object" && v !== null && "content" in v;
}

export function createEpicFhirMcpServer(ctx: BridgeContext): McpServer {
  const server = new McpServer({ name: "epic-fhir-bridge", version: "0.1.0" });
  const pid = ctx.enrollment.fhirPatientId;
  const ro = { readOnlyHint: true, openWorldHint: false };

  server.registerTool(
    "get_patient_summary",
    { description: "Demographics of the patient under review (Epic Patient.Read) plus the pathway enrollment: procedure date, follow-up visit time, distance to UOHI.", annotations: ro },
    async () => {
      const r = await safe(() => ctx.fhir.read("Patient", pid));
      if (isToolText(r)) return r;
      const age = r.birthDate ? Math.floor((ctx.now.getTime() - Date.parse(r.birthDate)) / (365.25 * 86_400_000)) : null;
      return json({
        source: `Epic FHIR Patient/${pid}`,
        name: patientName(r),
        age,
        sex: r.gender ?? null,
        pathway: {
          procedure: ctx.enrollment.procedure.code,
          procedure_date: ctx.procedureDate.slice(0, 10),
          followup_visit: ctx.visitAt,
          distance_to_uohi_km: ctx.enrollment.distanceKm,
          note: "Procedure, dates and distance are SYNTHETIC demo enrollment data.",
        },
      });
    },
  );

  server.registerTool(
    "list_conditions",
    { description: "Active problem-list conditions and diagnoses (Epic Condition.Search).", annotations: ro },
    async () => {
      const r = await safe(() => ctx.fhir.search("Condition", { patient: pid }));
      if (isToolText(r)) return r;
      const items = r
        .filter((c) => (c.clinicalStatus?.coding?.[0]?.code ?? "active") === "active")
        .map((c) => ({ condition: text(c.code), codes: codes(c.code), onset: c.onsetDateTime ?? null }));
      return json({ source: "Epic FHIR Condition", count: items.length, conditions: items.slice(0, 60) });
    },
  );

  server.registerTool(
    "list_medications",
    { description: "Active medication orders (Epic MedicationRequest.Search).", annotations: ro },
    async () => {
      const r = await safe(() => ctx.fhir.search("MedicationRequest", { patient: pid, status: "active" }));
      if (isToolText(r)) return r;
      const meds = r.map((m) => ({ medication: m.medicationCodeableConcept ? text(m.medicationCodeableConcept) : m.medicationReference?.display ?? "unknown", status: m.status }));
      return json({ source: "Epic FHIR MedicationRequest", count: meds.length, medications: meds.slice(0, 60) });
    },
  );

  server.registerTool(
    "get_glycemic_labs",
    { description: "HbA1c and blood glucose results (Epic Observation.Search, category laboratory), newest first.", annotations: ro },
    async () => {
      const r = await safe(() => ctx.fhir.search("Observation", { patient: pid, category: "laboratory" }));
      if (isToolText(r)) return r;
      const all = [...LOINC.hba1c, ...LOINC.glucoseMmol, ...LOINC.glucoseMgdl] as string[];
      const labs = r
        .filter((o) => codes(o.code).some((c) => all.includes(c)))
        .map((o) => ({ test: text(o.code), loinc: codes(o.code), value: o.valueQuantity?.value ?? null, unit: o.valueQuantity?.unit ?? null, date: o.effectiveDateTime ?? o.issued ?? null }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return json({ source: "Epic FHIR Observation (laboratory)", count: labs.length, results: labs.slice(0, 30) });
    },
  );

  server.registerTool(
    "get_recent_vitals",
    { description: "Most recent vital signs (Epic Observation.Search, category vital-signs).", annotations: ro },
    async () => {
      const r = await safe(() => ctx.fhir.search("Observation", { patient: pid, category: "vital-signs" }));
      if (isToolText(r)) return r;
      const v = r
        .map((o) => ({ vital: text(o.code), value: o.valueQuantity?.value ?? o.component?.map((c: Resource) => `${text(c.code)} ${c.valueQuantity?.value ?? ""}`).join(", ") ?? null, unit: o.valueQuantity?.unit ?? null, date: o.effectiveDateTime ?? null }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      return json({ source: "Epic FHIR Observation (vital-signs)", count: v.length, vitals: v.slice(0, 20) });
    },
  );

  server.registerTool(
    "find_operative_note",
    {
      description: "Find the operative (OR) note for the sternal wire-related procedure and return its text, to determine the skin-closure method (absorbable vs retention/stay sutures).",
      inputSchema: { reason: z.string().max(200).optional().describe("Optional short note on what you are looking for") },
      annotations: ro,
    },
    async () => {
      if (ctx.orNoteEpicId && ctx.fhir.kind === "epic") {
        const r = await safe(async () => {
          const doc = await ctx.fhir.read("DocumentReference", ctx.orNoteEpicId!);
          const att = doc.content?.[0]?.attachment;
          const body = att?.data ? Buffer.from(att.data, "base64").toString("utf8") : att?.url ? await ctx.fhir.readBinaryText(att.url) : null;
          return { doc, body };
        });
        if (!isToolText(r) && r.body?.includes(OR_NOTE_MARKER)) {
          return json({ source: `Epic FHIR DocumentReference/${ctx.orNoteEpicId}`, date: r.doc.date ?? null, text: r.body });
        }
      }
      return json({
        source: "Local synthetic OR note (the Epic sandbox has no operative note for this test patient; filing it to Epic was not possible or not attempted)",
        date: ctx.procedureDate.slice(0, 10),
        text: ctx.enrollment.orNote,
      });
    },
  );

  server.registerTool(
    "get_screening_questionnaire",
    { description: "The patient's pre-visit screening answers (wound, symptoms, digital readiness) collected by the outreach agent.", annotations: ro },
    async () => {
      if (!ctx.answers) return json({ status: "not yet completed" });
      return json({
        source: ctx.answersSource,
        answers: ITEMS.map((i) => ({ item: i.id, section: i.section, answer: ctx.answers![i.id] ?? "unanswered" })),
      });
    },
  );

  return server;
}
