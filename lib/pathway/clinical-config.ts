// Clinical thresholds and weights used by the PoC.
//
// ⚠ NEEDS CLINICAL SIGN-OFF. These values were chosen for a demonstration and must be
// reviewed by the ACTU clinical team before any real use. Every value is referenced in
// docs/poc-plan.md §7 and covered by tests/pathway.test.ts.

export const SUITABILITY_WEIGHTS = {
  // Approved by project owner, 2026-11-26.
  noQuestionnaireRedFlags: 30,
  woundPhotoReassuring: 30,
  noHandsOnNeed: 20, // absorbable closure per OR note
  digitalReadiness: 10, // video-capable = 10, phone only = 5, neither = 0
  dataCompleteness: 10, // questionnaire 4 + usable photo 3 + OR note found 3
} as const;

export const DIGITAL_PHONE_ONLY_POINTS = 5;
export const COMPLETENESS_POINTS = { questionnaire: 4, photo: 3, orNote: 3 } as const;

/** A photo finding at or above this model confidence is treated as present (→ red flag for APN). */
export const PHOTO_FINDING_THRESHOLD = 0.5;

/**
 * Glycemia attention flag ("uncontrolled diabetes / high glycemia").
 * Owner asked for the safest rule per guidelines; because the flag only draws APN attention
 * and never changes the score, the most sensitive defensible thresholds were chosen:
 *  - HbA1c above the Diabetes Canada general glycemic target (≤ 7.0%).
 *  - Blood glucose above 10.0 mmol/L — upper limit of the perioperative/in-hospital target
 *    range (5–10 mmol/L) used by Diabetes Canada and cardiac-surgery glucose guidance.
 *  - A diabetes diagnosis coded "with hyperglycemia".
 *  - A diabetic patient with no HbA1c in the last 6 months ("glycemic control unknown").
 * Sourced from guideline knowledge, not re-verified in this build: sign-off required.
 */
export const GLYCEMIA = {
  hba1cAbovePercent: 7.0,
  hba1cMaxAgeDays: 183,
  glucoseAboveMmolL: 10.0,
  glucoseLookbackDays: 14,
} as const;

/** LOINC codes recognised for glycemic labs. */
export const LOINC = {
  hba1c: ["4548-4", "17856-6", "4549-2", "59261-8"],
  glucoseMmol: ["15074-8", "14749-6", "14743-9", "14770-2"],
  glucoseMgdl: ["2345-7", "2339-0", "41653-7", "1547-9"],
} as const;

/** SNOMED / ICD-10 hints for diabetes and diabetes "with hyperglycemia". */
export const DIABETES_CODES = {
  icd10Prefixes: ["E10", "E11", "E13"],
  icd10Hyperglycemia: ["E10.65", "E11.65", "E13.65"],
  snomedDiabetes: ["44054006", "46635009", "73211009"],
  textHyperglycemia: [/hyperglyc/i, /uncontrolled/i, /poorly controlled/i],
  textDiabetes: [/diabet/i],
} as const;

/** Outreach timeline (hours before the follow-up visit V). */
export const OUTREACH_HOURS = { invite: 72, reminder: 48, call: 24 } as const;
