// OFFLINE SAMPLE DATA — used only when DATA_SOURCE=offline (no network / rehearsal).
// Hand-written, synthetic, minimal FHIR R4 resources for the four sandbox test patient IDs.
// This is NOT what Epic returns; live mode always reads from the Epic sandbox.
import type { Resource } from "./fhir";

const p = (id: string, given: string, family: string, birthDate: string, gender: string): Resource => ({
  resourceType: "Patient",
  id,
  name: [{ use: "official", given: [given], family }],
  birthDate,
  gender,
  meta: { tag: [{ code: "offline-sample" }] },
});

const cond = (pid: string, id: string, text: string, code?: string): Resource => ({
  resourceType: "Condition",
  id,
  subject: { reference: `Patient/${pid}` },
  clinicalStatus: { coding: [{ code: "active" }] },
  category: [{ coding: [{ code: "problem-list-item" }] }],
  code: { text, coding: code ? [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code, display: text }] : [] },
});

const obs = (pid: string, id: string, loinc: string, text: string, value: number, unit: string, daysAgo: number): Resource => ({
  resourceType: "Observation",
  id,
  status: "final",
  subject: { reference: `Patient/${pid}` },
  category: [{ coding: [{ code: "laboratory" }] }],
  code: { text, coding: [{ system: "http://loinc.org", code: loinc, display: text }] },
  valueQuantity: { value, unit },
  effectiveDateTime: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
});

const CAMILA = "erXuFYUfucBZaryVksYEcMg3";
const DERRICK = "eq081-VQEgP8drUUqCWzHfw3";
const DESIREE = "eAB3mDIBBcyUKviyzrxsnAw3";
const WARREN = "e0w0LEDCYtfckT6N.CkJKCw3";

export const OFFLINE: Resource[] = [
  p(CAMILA, "Camila", "Lopez", "1987-09-12", "female"),
  p(DERRICK, "Derrick", "Lin", "1973-06-03", "male"),
  p(DESIREE, "Desiree", "Powell", "2014-01-15", "female"),
  p(WARREN, "Warren", "McGinnis", "1952-03-24", "male"),
  cond(CAMILA, "off-c1", "Hyperlipidemia", "E78.5"),
  cond(DERRICK, "off-c2", "Type 2 diabetes mellitus", "E11.9"),
  cond(DERRICK, "off-c3", "Essential hypertension", "I10"),
  obs(DERRICK, "off-o1", "4548-4", "Hemoglobin A1c", 8.1, "%", 40),
  cond(WARREN, "off-c4", "Essential hypertension", "I10"),
  cond(WARREN, "off-c5", "Chronic obstructive pulmonary disease", "J44.9"),
];
