// Glycemia attention flag. Pure function over minimal FHIR R4 shapes — deterministic, no AI.
import { DIABETES_CODES, GLYCEMIA, LOINC } from "./clinical-config";

export interface Coding { system?: string; code?: string; display?: string }
export interface CodeableConcept { coding?: Coding[]; text?: string }
export interface ConditionLite {
  code?: CodeableConcept;
  clinicalStatus?: CodeableConcept;
}
export interface ObservationLite {
  code?: CodeableConcept;
  valueQuantity?: { value?: number; unit?: string; code?: string };
  effectiveDateTime?: string;
  issued?: string;
}

export type GlycemiaReason =
  | { kind: "hba1c_high"; valuePercent: number; date: string }
  | { kind: "glucose_high"; valueMmolL: number; date: string }
  | { kind: "coded_hyperglycemia"; text: string }
  | { kind: "no_recent_hba1c"; lastDate: string | null };

export interface GlycemiaResult {
  diabetic: boolean;
  flag: boolean;
  reasons: GlycemiaReason[];
  latestHba1c: { valuePercent: number; date: string } | null;
  maxRecentGlucose: { valueMmolL: number; date: string } | null;
}

const DAY = 86_400_000;

function conceptText(c?: CodeableConcept): string {
  return [c?.text, ...(c?.coding ?? []).map((x) => `${x.display ?? ""} ${x.code ?? ""}`)].join(" ");
}

function isActive(c: ConditionLite): boolean {
  const s = c.clinicalStatus?.coding?.[0]?.code;
  return s === undefined || s === "active" || s === "recurrence" || s === "relapse";
}

function hasCode(c: CodeableConcept | undefined, codes: readonly string[]): boolean {
  return (c?.coding ?? []).some((x) => x.code !== undefined && codes.includes(x.code));
}

function isDiabetes(c: ConditionLite): boolean {
  const codings = c.code?.coding ?? [];
  if (codings.some((x) => x.code && DIABETES_CODES.icd10Prefixes.some((p) => x.code!.startsWith(p)))) return true;
  if (hasCode(c.code, DIABETES_CODES.snomedDiabetes)) return true;
  return DIABETES_CODES.textDiabetes.some((re) => re.test(conceptText(c.code)));
}

function isHyperglycemiaCoded(c: ConditionLite): boolean {
  if (hasCode(c.code, DIABETES_CODES.icd10Hyperglycemia)) return true;
  const text = conceptText(c.code);
  return DIABETES_CODES.textDiabetes.some((re) => re.test(text)) &&
    DIABETES_CODES.textHyperglycemia.some((re) => re.test(text));
}

function obsDate(o: ObservationLite): string | null {
  return o.effectiveDateTime ?? o.issued ?? null;
}

function hba1cPercent(o: ObservationLite): number | null {
  const v = o.valueQuantity?.value;
  if (typeof v !== "number") return null;
  const unit = (o.valueQuantity?.unit ?? o.valueQuantity?.code ?? "").toLowerCase();
  if (unit.includes("mmol/mol")) return Math.round((0.0915 * v + 2.15) * 10) / 10; // IFCC → NGSP
  return v;
}

function glucoseMmol(o: ObservationLite): number | null {
  const v = o.valueQuantity?.value;
  if (typeof v !== "number") return null;
  const unit = (o.valueQuantity?.unit ?? o.valueQuantity?.code ?? "").toLowerCase();
  if (unit.includes("mg/dl") || hasCode(o.code, LOINC.glucoseMgdl) && !unit.includes("mmol")) {
    return Math.round((v / 18.016) * 10) / 10;
  }
  return v;
}

export function assessGlycemia(
  conditions: ConditionLite[],
  observations: ObservationLite[],
  now: Date,
): GlycemiaResult {
  const active = conditions.filter(isActive);
  const diabetic = active.some(isDiabetes);
  const reasons: GlycemiaReason[] = [];

  for (const c of active) {
    if (isHyperglycemiaCoded(c)) reasons.push({ kind: "coded_hyperglycemia", text: conceptText(c.code).trim() });
  }

  const dated = observations
    .map((o) => ({ o, d: obsDate(o) }))
    .filter((x): x is { o: ObservationLite; d: string } => x.d !== null && !Number.isNaN(Date.parse(x.d)))
    .sort((a, b) => Date.parse(b.d) - Date.parse(a.d));

  const a1cs = dated.filter((x) => hasCode(x.o.code, LOINC.hba1c));
  const latestA1c = a1cs.find((x) => hba1cPercent(x.o) !== null);
  const latestHba1c = latestA1c ? { valuePercent: hba1cPercent(latestA1c.o)!, date: latestA1c.d } : null;
  const a1cRecent = latestHba1c !== null && now.getTime() - Date.parse(latestHba1c.date) <= GLYCEMIA.hba1cMaxAgeDays * DAY;

  if (latestHba1c && a1cRecent && latestHba1c.valuePercent > GLYCEMIA.hba1cAbovePercent) {
    reasons.push({ kind: "hba1c_high", ...latestHba1c });
  }
  if (diabetic && !a1cRecent) {
    reasons.push({ kind: "no_recent_hba1c", lastDate: latestHba1c?.date ?? null });
  }

  let maxRecentGlucose: GlycemiaResult["maxRecentGlucose"] = null;
  for (const x of dated) {
    if (!hasCode(x.o.code, [...LOINC.glucoseMmol, ...LOINC.glucoseMgdl])) continue;
    if (now.getTime() - Date.parse(x.d) > GLYCEMIA.glucoseLookbackDays * DAY) continue;
    const g = glucoseMmol(x.o);
    if (g !== null && (maxRecentGlucose === null || g > maxRecentGlucose.valueMmolL)) {
      maxRecentGlucose = { valueMmolL: g, date: x.d };
    }
  }
  if (maxRecentGlucose && maxRecentGlucose.valueMmolL > GLYCEMIA.glucoseAboveMmolL) {
    reasons.push({ kind: "glucose_high", ...maxRecentGlucose });
  }

  return { diabetic, flag: reasons.length > 0, reasons, latestHba1c, maxRecentGlucose };
}
