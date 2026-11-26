// FHIR R4 resource builders for the writes the PoC attempts against the Epic sandbox.
import "server-only";
import { ITEMS, type Answers } from "@/lib/pathway/questionnaire";

export const QUESTIONNAIRE_CANONICAL = "urn:actu-poc:questionnaire:pre-visit-screening:v1";

export function questionnaireResponse(patientId: string, answers: Answers, authored: string, labels: Record<string, string>) {
  return {
    resourceType: "QuestionnaireResponse",
    status: "completed",
    questionnaire: QUESTIONNAIRE_CANONICAL,
    subject: { reference: `Patient/${patientId}` },
    authored,
    item: ITEMS.filter((i) => answers[i.id]).map((i) => ({
      linkId: i.id,
      text: labels[i.id] ?? i.id,
      answer: [{ valueBoolean: answers[i.id] === "yes" }],
    })),
  };
}

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
