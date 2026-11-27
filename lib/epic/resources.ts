// FHIR R4 resource builders for the writes the PoC makes to the Epic sandbox (clinical notes only).
import "server-only";

export function clinicalNote(patientId: string, title: string, text: string, date: string, encounterId?: string) {
  return {
    resourceType: "DocumentReference",
    status: "current",
    docStatus: "final",
    type: { coding: [{ system: "http://loinc.org", code: "11506-3", display: "Progress note" }], text: title },
    category: [{ coding: [{ system: "http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category", code: "clinical-note", display: "Clinical Note" }] }],
    subject: { reference: `Patient/${patientId}` },
    date,
    description: title,
    content: [{ attachment: { contentType: "text/plain", data: Buffer.from(text, "utf8").toString("base64"), title } }],
    ...(encounterId ? { context: { encounter: [{ reference: `Encounter/${encounterId}` }] } } : {}),
  };
}
