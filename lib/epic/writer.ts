// EpicWriter: try the real Epic write; if the sandbox refuses it, keep the data locally and
// record exactly what happened (shown in the UI and the audit log — never silent).
// Swap-in point for real Epic writes later: only this file changes.
import "server-only";
import { audit, type Actor } from "@/lib/audit";
import { type WriteRecord, enrollmentState, update } from "@/lib/store";
import { FhirError, type FhirSource, type Resource } from "./fhir";

export async function writeToEpic(
  fhir: FhirSource | null,
  enrollmentId: string,
  actor: Actor,
  resource: Resource,
): Promise<WriteRecord> {
  const at = new Date().toISOString();
  let rec: WriteRecord;
  if (!fhir) {
    rec = { at, resource: resource.resourceType, target: "local", status: "local_only", note: "not signed in to Epic" };
  } else if (fhir.kind === "offline") {
    rec = { at, resource: resource.resourceType, target: "local", status: "local_only", note: "offline mode" };
  } else {
    try {
      const r = await fhir.create(resource.resourceType, resource);
      rec = { at, resource: resource.resourceType, target: "epic", status: "created", epicId: r.id };
    } catch (e) {
      const note = e instanceof FhirError ? `Epic HTTP ${e.status}: ${e.summary}` : "network error";
      rec = { at, resource: resource.resourceType, target: "local", status: "failed", note };
    }
  }
  update(() => {
    enrollmentState(enrollmentId).writes.push(rec);
  });
  audit({
    actor,
    action: "fhir.write",
    enrollmentId,
    detail: { resource: rec.resource, status: rec.status, target: rec.target, epicId: rec.epicId ?? null },
  });
  return rec;
}
