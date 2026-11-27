// Server-side orchestration shared by pages and API routes.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { audit, type Actor } from "@/lib/audit";
import { now } from "@/lib/clock";
import { config } from "@/lib/config";
import { COHORT, type Enrollment, SYNTHETIC_PHOTOS, enrollmentById, procedureDate, visitAt } from "@/lib/demo/cohort";
import { type FhirSource, type Resource, fhirSource, patientName } from "@/lib/epic/fhir";
import { clinicalNote } from "@/lib/epic/resources";
import { writeToEpic } from "@/lib/epic/writer";
import { DICTS } from "@/lib/i18n";
import type { AssistantResult } from "@/lib/agents/assistant";
import { type OutreachStatus, outreachStatus, worklistPriority } from "@/lib/pathway/outreach";
import { type Answers, ITEMS } from "@/lib/pathway/questionnaire";
import { type Session, getSession, validToken } from "@/lib/session";
import { type EnrollmentState, PHOTO_DIR, enrollmentState, getState, update } from "@/lib/store";

export function clinicianFhir(s: Session | null): FhirSource | null {
  return fhirSource(validToken(s?.clinician) ? s!.clinician : null);
}

export function clinicianActor(s: Session | null): Actor {
  const u = s?.clinician?.fhirUser;
  return { kind: "clinician", id: u ? u.split("/").pop()! : config.dataSource === "offline" ? "offline-demo-user" : "unknown" };
}

/** Apply due outreach actions (Agent 1 scheduler). Idempotent; called on page loads and API calls. */
export function syncOutreach(): void {
  const s = getState();
  const t = now();
  for (const e of COHORT) {
    const st = enrollmentState(e.id);
    const status = outreachStatus(visitAt(s.demo.startedAt), st.events, e.mychartUser !== null, t);
    for (const action of status.dueActions) {
      const type = action === "send_invite" ? "invite_sent" : "reminder_sent";
      update(() => st.events.push({ type, at: t.toISOString(), channel: "mychart" }));
      audit({ actor: { kind: "agent", name: "outreach" }, action: `outreach.${type}`, enrollmentId: e.id, demoAt: t.toISOString(), detail: { channel: "mychart-simulated" } });
    }
  }
}

export interface WorklistRow {
  enrollment: Enrollment;
  name: string;
  nameSource: "epic" | "offline" | "unavailable";
  status: OutreachStatus;
  visitAt: string;
  procedureDate: string;
  state: EnrollmentState;
  score: number | null;
  apnAttention: boolean;
  awaitingDecision: boolean;
  priority: number;
}

async function readPatient(fhir: FhirSource | null, id: string): Promise<{ p: Resource | null; err: string | null }> {
  if (!fhir) return { p: null, err: "not signed in" };
  try {
    return { p: await fhir.read("Patient", id), err: null };
  } catch (e) {
    return { p: null, err: e instanceof Error ? e.message : "error" };
  }
}

export async function worklist(): Promise<{ rows: WorklistRow[]; epicError: string | null }> {
  syncOutreach();
  const session = await getSession();
  const fhir = clinicianFhir(session);
  const s = getState();
  const t = now();
  let epicError: string | null = null;
  const rows = await Promise.all(
    COHORT.map(async (e) => {
      const st = enrollmentState(e.id);
      const status = outreachStatus(visitAt(s.demo.startedAt), st.events, e.mychartUser !== null, t);
      const { p, err } = await readPatient(fhir, e.fhirPatientId);
      if (err && fhir) epicError = err;
      const a = st.assistant as AssistantResult | null;
      const awaitingDecision = status.stage === "completed" && st.decision === null;
      const apnAttention = a?.suitability.apnAttention ?? false;
      return {
        enrollment: e,
        name: patientName(p) ?? e.sandboxName,
        nameSource: p ? (fhir?.kind ?? "epic") : "unavailable",
        status,
        visitAt: visitAt(s.demo.startedAt),
        procedureDate: procedureDate(e, s.demo.startedAt),
        state: st,
        score: a?.suitability.score ?? null,
        apnAttention,
        awaitingDecision,
        priority: worklistPriority(status.stage, apnAttention, awaitingDecision, status.overdue),
      } satisfies WorklistRow;
    }),
  );
  rows.sort((a, b) => a.priority - b.priority || a.enrollment.id.localeCompare(b.enrollment.id));
  return { rows, epicError };
}

export function savePhotoFromSynthetic(enrollmentId: string, name: string): string {
  if (!(SYNTHETIC_PHOTOS as readonly string[]).includes(name)) throw new Error("unknown synthetic photo");
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const file = `${enrollmentId}.jpg`;
  for (const old of [`${enrollmentId}.png`, `${enrollmentId}.jpg`]) fs.rmSync(path.join(PHOTO_DIR, old), { force: true });
  fs.copyFileSync(path.join(process.cwd(), "public", "synthetic", name), path.join(PHOTO_DIR, file));
  return file;
}

export function savePhotoFromDataUrl(enrollmentId: string, dataUrl: string): string {
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error("invalid image");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 6_000_000) throw new Error("image too large");
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  const file = `${enrollmentId}.${m[1] === "jpeg" ? "jpg" : "png"}`;
  for (const old of [`${enrollmentId}.png`, `${enrollmentId}.jpg`]) fs.rmSync(path.join(PHOTO_DIR, old), { force: true });
  fs.writeFileSync(path.join(PHOTO_DIR, file), buf);
  return file;
}

/**
 * Record completed screening answers (from the MyChart-style form or the agent call).
 * Kept in the app until the APN decides; they are then filed to Epic inside the decision note
 * (Option A). Epic's QuestionnaireResponse.Create only accepts Epic-built questionnaires assigned
 * to an appointment/series and is not offered to patient-facing apps, so it is not used.
 */
export async function recordScreening(params: {
  enrollmentId: string;
  answers: Answers;
  source: "mychart" | "call";
  actor: Actor;
}): Promise<void> {
  const e = enrollmentById(params.enrollmentId)!;
  const at = now().toISOString();
  update(() => {
    const st = enrollmentState(e.id);
    st.answers = params.answers;
    st.answersSource = params.source;
    st.assistant = null; // new evidence → assistant must re-run
    st.events.push({ type: params.source === "mychart" ? "questionnaire_submitted" : "call_completed", at, channel: params.source });
  });
  audit({ actor: params.actor, action: "screening.recorded", enrollmentId: e.id, demoAt: at, detail: { source: params.source } });
}

/** Most recent encounter for the patient — Epic files clinical notes (DocumentReference.Create) to an encounter. */
export async function latestEncounterId(fhir: FhirSource | null, patientId: string): Promise<string | undefined> {
  if (fhir?.kind !== "epic") return undefined;
  const enc = await fhir.search("Encounter", { patient: patientId }).catch(() => []);
  const start = (r: Resource) => Date.parse(r.period?.start ?? r.period?.end ?? "") || 0;
  return [...enc].sort((a, b) => start(b) - start(a))[0]?.id;
}

/** Try to file the synthetic OR note into the sandbox as a clinical note (DocumentReference.Create). */
export async function seedOrNote(enrollmentId: string): Promise<string> {
  const session = await getSession();
  const fhir = clinicianFhir(session);
  const e = enrollmentById(enrollmentId)!;
  const st = enrollmentState(e.id);
  if (st.orNote?.target === "epic") return "already filed";
  const actor = clinicianActor(session);
  const encounterId = await latestEncounterId(fhir, e.fhirPatientId);
  const note = clinicalNote(e.fhirPatientId, "Operative note (SYNTHETIC demo)", e.orNote, procedureDate(e, getState().demo.startedAt), encounterId);
  const rec = await writeToEpic(fhir, e.id, actor, note);
  update(() => {
    enrollmentState(e.id).orNote = rec.status === "created" ? { target: "epic", epicId: rec.epicId } : { target: "local" };
  });
  return rec.status === "created" ? `filed (DocumentReference/${rec.epicId ?? "?"})` : `kept locally — ${rec.note}`;
}

export function photoUrl(st: EnrollmentState, enrollmentId: string): string | null {
  return st.photo ? `/api/patients/${enrollmentId}/photo?v=${encodeURIComponent(st.photo.at)}` : null;
}
