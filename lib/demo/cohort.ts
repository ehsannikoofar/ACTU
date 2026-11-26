// Demo cohort: real Epic sandbox TEST patients (public test data from fhir.epic.com) enrolled
// in the pathway with SYNTHETIC procedure details. The sandbox has no sternal wire procedures,
// so procedure type, closure method, OR note and distance below are invented for the demo.
// No real patient data anywhere.

export interface Enrollment {
  id: string;
  fhirPatientId: string;
  /** Shown only if Epic is unreachable (offline mode). Live mode reads the name from Epic. */
  sandboxName: string;
  mychartUser: string | null; // sandbox MyChart login (public test account) or null = no portal
  procedure: { code: string; offsetDaysBeforeVisit: number };
  /** Distance to UOHI in km — synthetic, used to inform the local-suture-removal option. */
  distanceKm: number;
  orNote: string; // synthetic operative note (EN), filed to the sandbox as a clinical note if permitted
  suggestedPhoto: string; // synthetic image in /public/synthetic (.jpg) used in the demo script
}

const HEADER = "SYNTHETIC OPERATIVE NOTE — DEMONSTRATION ONLY — NOT A REAL PATIENT";

export const COHORT: Enrollment[] = [
  {
    id: "enr-01",
    fhirPatientId: "erXuFYUfucBZaryVksYEcMg3",
    sandboxName: "Camila Lopez",
    mychartUser: "fhircamila",
    procedure: { code: "sternal_wire_removal", offsetDaysBeforeVisit: 14 },
    distanceKm: 96,
    suggestedPhoto: "wound-healing.jpg",
    orNote: `${HEADER}
Procedure: Removal of sternal wires x3 (symptomatic prominent wires), previous median sternotomy (CABG).
Findings: Sternum stable and healed. Wires at levels 2-4 prominent and palpable. No purulence, no fluid collection.
Closure: Layered closure with absorbable sutures (2-0 and 3-0 absorbable, subcuticular 4-0 absorbable). No retention or stay sutures. Skin glue applied.
Estimated blood loss: minimal. Complications: none.
Plan: Discharge home same day. Follow-up in ACTU in approximately 2 weeks.`,
  },
  {
    id: "enr-02",
    fhirPatientId: "eq081-VQEgP8drUUqCWzHfw3",
    sandboxName: "Derrick Lin",
    mychartUser: "fhirderrick",
    procedure: { code: "sternal_rewiring_fixation", offsetDaysBeforeVisit: 14 },
    distanceKm: 148,
    suggestedPhoto: "wound-retention-sutures.jpg",
    orNote: `${HEADER}
Procedure: Sternal rewiring with plate fixation for sternal instability (clicking), previous median sternotomy (aortic valve replacement).
Findings: Partial sternal non-union lower third. No infection. Cultures sent, preliminary negative.
Closure: Fascia closed with absorbable suture. Skin closed with interrupted non-absorbable nylon RETENTION SUTURES (to be removed at approximately 14 days).
Complications: none.
Plan: Sternal precautions 6 weeks. Retention sutures require removal. Follow-up in ACTU in approximately 2 weeks.`,
  },
  {
    id: "enr-03",
    fhirPatientId: "eAB3mDIBBcyUKviyzrxsnAw3",
    sandboxName: "Desiree Powell",
    mychartUser: "fhirdesiree",
    procedure: { code: "sternal_debridement_closure", offsetDaysBeforeVisit: 15 },
    distanceKm: 22,
    suggestedPhoto: "wound-redness-drainage.jpg",
    orNote: `${HEADER}
Procedure: Superficial sternal wound debridement and primary closure, previous median sternotomy (CABG).
Findings: Superficial dehiscence lower pole, no sternal involvement, wires intact. Tissue sent for culture.
Closure: Layered absorbable closure (2-0, 3-0 absorbable; 4-0 absorbable subcuticular). No retention sutures.
Complications: none.
Plan: Wound monitoring; follow-up in ACTU in approximately 2 weeks.`,
  },
  {
    id: "enr-04",
    fhirPatientId: "e0w0LEDCYtfckT6N.CkJKCw3",
    sandboxName: "Warren McGinnis",
    mychartUser: null,
    procedure: { code: "sternal_wire_tightening", offsetDaysBeforeVisit: 13 },
    distanceKm: 61,
    suggestedPhoto: "wound-healing.jpg",
    orNote: `${HEADER}
Procedure: Re-tightening of sternal wires x2 for mechanical sternal pain, previous median sternotomy (CABG).
Findings: Two loose wires at manubrium; sternum otherwise stable. No infection.
Closure: Layered closure with absorbable sutures. Skin: absorbable subcuticular. No retention sutures.
Complications: none.
Plan: Follow-up in ACTU in approximately 2 weeks.`,
  },
];

export function enrollmentById(id: string): Enrollment | undefined {
  return COHORT.find((e) => e.id === id);
}

/** All demo visits are scheduled at the same time so the 72/48/24 h steps can be shown together. */
export const VISIT_HOURS_AFTER_DEMO_START = 80;

export function visitAt(demoStartedAt: string): string {
  return new Date(Date.parse(demoStartedAt) + VISIT_HOURS_AFTER_DEMO_START * 3_600_000).toISOString();
}

export function procedureDate(e: Enrollment, demoStartedAt: string): string {
  return new Date(Date.parse(visitAt(demoStartedAt)) - e.procedure.offsetDaysBeforeVisit * 86_400_000).toISOString();
}

export const SYNTHETIC_PHOTOS = [
  "wound-healing.jpg",
  "wound-retention-sutures.jpg",
  "wound-redness-drainage.jpg",
  "wound-gap.jpg",
  "wound-protruding-wire.jpg",
] as const;
