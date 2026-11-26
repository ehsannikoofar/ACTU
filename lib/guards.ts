// Access checks for API routes.
import "server-only";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { enrollmentById, type Enrollment } from "@/lib/demo/cohort";
import { type FhirSource, fhirSource } from "@/lib/epic/fhir";
import { type Session, getSession, validToken } from "@/lib/session";
import { clinicianActor, clinicianFhir } from "@/lib/service";
import type { Actor } from "@/lib/audit";

export type Guarded<T> = { ok: true; value: T } | { ok: false; res: NextResponse };

const deny = (status: number, msg: string): { ok: false; res: NextResponse } => ({ ok: false, res: NextResponse.json({ error: msg }, { status }) });

export async function requireClinician(): Promise<Guarded<{ session: Session | null; fhir: FhirSource; actor: Actor }>> {
  const session = await getSession();
  const fhir = clinicianFhir(session);
  if (!fhir) return deny(401, "Clinician sign-in with Epic required");
  return { ok: true, value: { session, fhir, actor: clinicianActor(session) } };
}

/** Patient-facing calls: the signed-in MyChart patient must be the enrolled patient (offline mode: allowed). */
export async function requirePatient(e: Enrollment): Promise<Guarded<{ fhir: FhirSource | null }>> {
  if (config.dataSource === "offline") return { ok: true, value: { fhir: fhirSource(null) } };
  const session = await getSession();
  const t = session?.patient;
  if (!validToken(t)) return deny(401, "MyChart sign-in required");
  if (t.patientId !== e.fhirPatientId) return deny(403, "Signed-in MyChart patient does not match this enrollment");
  return { ok: true, value: { fhir: fhirSource(t) } };
}

export function enrollmentOr404(id: string): Guarded<Enrollment> {
  const e = enrollmentById(id);
  return e ? { ok: true, value: e } : deny(404, "Unknown enrollment");
}

export async function canViewPhoto(e: Enrollment): Promise<boolean> {
  if (config.dataSource === "offline") return true;
  const session = await getSession();
  if (validToken(session?.clinician)) return true;
  return validToken(session?.patient) && session!.patient!.patientId === e.fhirPatientId;
}

/** Same-origin check for state-changing JSON requests (defence in depth on top of SameSite cookies). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin form posts from older browsers / server-side tests
  return origin === new URL(req.url).origin || origin === config.appBaseUrl;
}
