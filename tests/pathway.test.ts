import { describe, expect, it } from "vitest";
import { assessGlycemia, type ObservationLite } from "@/lib/pathway/glycemia";
import { outreachStatus, worklistPriority } from "@/lib/pathway/outreach";
import { type Answers, barrierItems, isComplete, redFlagItems } from "@/lib/pathway/questionnaire";
import { computeSuitability, digitalReadiness, type PhotoFindings } from "@/lib/pathway/suitability";

const ALL_CLEAR: Answers = {
  wound_opening: "no",
  wound_drainage_redness: "no",
  wound_protruding: "no",
  sym_fever: "no",
  sym_chest_pain_sob: "no",
  sym_dizzy_hr_bp: "no",
  pt_device_camera: "yes",
  pt_internet: "yes",
  pt_can_send_photo: "yes",
  pt_willing_video_phone: "yes",
};

const CLEAN_PHOTO: PhotoFindings = {
  usable: true,
  findings: {
    incision_opening: { present: false, confidence: 1, evidence: "" },
    drainage: { present: false, confidence: 1, evidence: "" },
    spreading_redness: { present: false, confidence: 1, evidence: "" },
    protruding_suture_or_wire: { present: false, confidence: 1, evidence: "" },
  },
};

const base = { answers: ALL_CLEAR, photo: CLEAN_PHOTO, closure: "absorbable" as const, orNoteFound: true, glycemia: null };

describe("questionnaire (Table 10)", () => {
  it("detects completeness, red flags and barriers", () => {
    expect(isComplete(ALL_CLEAR)).toBe(true);
    expect(isComplete({ ...ALL_CLEAR, sym_fever: undefined })).toBe(false);
    expect(redFlagItems({ ...ALL_CLEAR, sym_fever: "yes", wound_opening: "yes" })).toEqual(["wound_opening", "sym_fever"]);
    expect(barrierItems({ ...ALL_CLEAR, pt_internet: "no" })).toEqual(["pt_internet"]);
  });
});

describe("suitability index (weights 30/30/20/10/10)", () => {
  it("scores 100 when everything is reassuring and suggests a virtual visit", () => {
    const r = computeSuitability(base);
    expect(r.score).toBe(100);
    expect(r.flags).toEqual([]);
    expect(r.apnAttention).toBe(false);
    expect(r.options[0]).toBe("virtual_visit");
  });

  it("a questionnaire red flag removes 30 points, is flagged for APN attention, and does not auto-route", () => {
    const r = computeSuitability({ ...base, answers: { ...ALL_CLEAR, wound_drainage_redness: "yes" } });
    expect(r.score).toBe(70);
    expect(r.apnAttention).toBe(true);
    expect(r.flags).toContainEqual({ kind: "red_flag_questionnaire", items: ["wound_drainage_redness"] });
    // APN still gets a choice: in person suggested, phone advice and virtual remain available.
    expect(r.options).toEqual(["in_person_actu", "phone_advice", "virtual_visit"]);
  });

  it("each symptom item is a red flag (fever, chest pain/SOB, dizziness/HR/BP)", () => {
    for (const id of ["sym_fever", "sym_chest_pain_sob", "sym_dizzy_hr_bp", "wound_opening", "wound_protruding"] as const) {
      const r = computeSuitability({ ...base, answers: { ...ALL_CLEAR, [id]: "yes" } });
      expect(r.apnAttention).toBe(true);
    }
  });

  it("a photo finding at/above the 0.5 confidence threshold is a red flag", () => {
    const photo: PhotoFindings = { ...CLEAN_PHOTO, findings: { ...CLEAN_PHOTO.findings, drainage: { present: true, confidence: 0.5, evidence: "serous drainage at lower pole" } } };
    const r = computeSuitability({ ...base, photo });
    expect(r.flags).toContainEqual({ kind: "red_flag_photo", findings: ["drainage"] });
    expect(r.apnAttention).toBe(true);
    // 3 of 4 findings absent with confidence 1 → round(30 * 3/4) = 23
    expect(r.components.find((c) => c.key === "woundPhotoReassuring")!.points).toBe(23);
  });

  it("a low-confidence 'present' finding below threshold loses points but is not a red flag", () => {
    const photo: PhotoFindings = { ...CLEAN_PHOTO, findings: { ...CLEAN_PHOTO.findings, spreading_redness: { present: true, confidence: 0.3, evidence: "" } } };
    const r = computeSuitability({ ...base, photo });
    expect(r.flags.some((f) => f.kind === "red_flag_photo")).toBe(false);
    expect(r.score).toBe(93);
  });

  it("photo confidence scales the photo component", () => {
    const f = { present: false, confidence: 0.8, evidence: "" };
    const photo: PhotoFindings = { usable: true, findings: { incision_opening: f, drainage: f, spreading_redness: f, protruding_suture_or_wire: f } };
    expect(computeSuitability({ ...base, photo }).components.find((c) => c.key === "woundPhotoReassuring")!.points).toBe(24);
  });

  it("no photo / unusable photo: 0 photo points, −3 completeness, flagged", () => {
    for (const photo of [null, { ...CLEAN_PHOTO, usable: false }]) {
      const r = computeSuitability({ ...base, photo });
      expect(r.score).toBe(67);
      expect(r.flags).toContainEqual({ kind: "photo_missing_or_unusable" });
    }
  });

  it("retention/stay sutures: −20 points and BOTH suture options for the APN (owner decision D-1)", () => {
    const r = computeSuitability({ ...base, closure: "retention_or_stay_sutures" });
    expect(r.score).toBe(80);
    expect(r.options).toEqual(["local_suture_removal_plus_apn_check", "in_person_actu"]);
  });

  it("unknown closure: −20 and flagged", () => {
    const r = computeSuitability({ ...base, closure: "unknown", orNoteFound: false });
    expect(r.score).toBe(77);
    expect(r.flags).toContainEqual({ kind: "closure_unknown" });
  });

  it("digital readiness: video 10, phone only 5, none 0; any 'No' in section 3 → phone visit or local support", () => {
    expect(digitalReadiness(ALL_CLEAR)).toBe("video");
    const phone = { ...ALL_CLEAR, pt_internet: "no" as const };
    expect(digitalReadiness(phone)).toBe("phone");
    expect(computeSuitability({ ...base, answers: phone }).score).toBe(95);
    expect(computeSuitability({ ...base, answers: phone }).options[0]).toBe("phone_visit_or_local_support");
    const none = { ...ALL_CLEAR, pt_willing_video_phone: "no" as const };
    expect(digitalReadiness(none)).toBe("none");
    expect(computeSuitability({ ...base, answers: none }).score).toBe(90);
  });

  it("incomplete questionnaire loses the questionnaire completeness points and is flagged", () => {
    const r = computeSuitability({ ...base, answers: { ...ALL_CLEAR, pt_internet: undefined } });
    expect(r.flags).toContainEqual({ kind: "questionnaire_incomplete" });
    expect(r.components.find((c) => c.key === "dataCompleteness")!.points).toBe(6);
  });

  it("the glycemia flag draws APN attention but never changes the score", () => {
    const glycemia = { diabetic: true, flag: true, reasons: [{ kind: "hba1c_high" as const, valuePercent: 8.2, date: "2026-10-01" }], latestHba1c: null, maxRecentGlucose: null };
    const r = computeSuitability({ ...base, glycemia });
    expect(r.score).toBe(100);
    expect(r.apnAttention).toBe(true);
    expect(r.options[0]).toBe("virtual_visit");
  });

  it("components always sum to the score and never exceed 100", () => {
    const r = computeSuitability({ ...base, closure: "retention_or_stay_sutures", answers: { ...ALL_CLEAR, sym_fever: "yes" } });
    expect(r.components.reduce((s, c) => s + c.points, 0)).toBe(r.score);
    expect(r.components.reduce((s, c) => s + c.max, 0)).toBe(100);
  });
});

describe("glycemia attention flag", () => {
  const now = new Date("2026-11-26T12:00:00Z");
  const diabetes = [{ code: { text: "Type 2 diabetes mellitus", coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: "E11.9" }] } }];
  const a1c = (value: number, date: string, unit = "%"): ObservationLite => ({ code: { coding: [{ code: "4548-4" }] }, valueQuantity: { value, unit }, effectiveDateTime: date });
  const glu = (value: number, unit: string, date: string, code = "2345-7"): ObservationLite => ({ code: { coding: [{ code }] }, valueQuantity: { value, unit }, effectiveDateTime: date });

  it("flags HbA1c above 7.0% but not at 7.0%", () => {
    expect(assessGlycemia(diabetes, [a1c(7.1, "2026-10-01")], now).reasons).toEqual([{ kind: "hba1c_high", valuePercent: 7.1, date: "2026-10-01" }]);
    expect(assessGlycemia(diabetes, [a1c(7.0, "2026-10-01")], now).flag).toBe(false);
  });

  it("converts IFCC mmol/mol HbA1c", () => {
    // 64 mmol/mol ≈ 8.0%
    expect(assessGlycemia(diabetes, [a1c(64, "2026-10-01", "mmol/mol")], now).latestHba1c?.valuePercent).toBe(8);
  });

  it("uses only the most recent HbA1c", () => {
    expect(assessGlycemia(diabetes, [a1c(9.5, "2026-06-30"), a1c(6.5, "2026-10-01")], now).flag).toBe(false);
  });

  it("flags a diabetic patient with no HbA1c in 6 months as glycemic control unknown", () => {
    const r = assessGlycemia(diabetes, [a1c(6.2, "2026-03-01")], now);
    expect(r.reasons).toEqual([{ kind: "no_recent_hba1c", lastDate: "2026-03-01" }]);
    expect(assessGlycemia(diabetes, [], now).reasons).toEqual([{ kind: "no_recent_hba1c", lastDate: null }]);
  });

  it("flags glucose above 10.0 mmol/L in the last 14 days, converting mg/dL", () => {
    expect(assessGlycemia([], [glu(10.5, "mmol/L", "2026-11-20", "15074-8")], now).flag).toBe(true);
    expect(assessGlycemia([], [glu(10.0, "mmol/L", "2026-11-20", "15074-8")], now).flag).toBe(false);
    expect(assessGlycemia([], [glu(190, "mg/dL", "2026-11-20")], now).reasons[0]).toMatchObject({ kind: "glucose_high", valueMmolL: 10.5 });
    expect(assessGlycemia([], [glu(250, "mg/dL", "2026-11-01")], now).flag).toBe(false); // older than 14 days
  });

  it("flags a diagnosis coded 'with hyperglycemia'", () => {
    const coded = [{ code: { coding: [{ code: "E11.65", display: "Type 2 diabetes mellitus with hyperglycemia" }] } }];
    expect(assessGlycemia(coded, [a1c(6.5, "2026-10-01")], now).reasons[0].kind).toBe("coded_hyperglycemia");
  });

  it("ignores resolved conditions and does not flag non-diabetic patients without labs", () => {
    const resolved = [{ ...diabetes[0], clinicalStatus: { coding: [{ code: "resolved" }] } }];
    expect(assessGlycemia(resolved, [], now).flag).toBe(false);
    expect(assessGlycemia([{ code: { text: "Hypertension" } }], [], now).flag).toBe(false);
  });
});

describe("outreach timeline (V−72 invite, V−48 reminder, V−24 call)", () => {
  const visit = "2026-12-01T14:00:00.000Z";
  const at = (hoursBefore: number) => new Date(Date.parse(visit) - hoursBefore * 3_600_000);

  it("is scheduled before V−72h", () => {
    expect(outreachStatus(visit, [], true, at(80))).toMatchObject({ stage: "scheduled", dueActions: [], next: { label: "invite" } });
  });

  it("sends the MyChart invite at V−72h", () => {
    expect(outreachStatus(visit, [], true, at(72)).dueActions).toEqual(["send_invite"]);
    expect(outreachStatus(visit, [{ type: "invite_sent", at: at(72).toISOString() }], true, at(60)).stage).toBe("invited");
  });

  it("sends a reminder at V−48h if no response", () => {
    const ev = [{ type: "invite_sent" as const, at: at(72).toISOString() }];
    expect(outreachStatus(visit, ev, true, at(48)).dueActions).toEqual(["send_reminder"]);
    expect(outreachStatus(visit, [...ev, { type: "reminder_sent" as const, at: at(48).toISOString() }], true, at(30)).stage).toBe("reminded");
  });

  it("makes the call due at V−24h if still no response, and stops sending reminders", () => {
    const ev = [{ type: "invite_sent" as const, at: "" }, { type: "reminder_sent" as const, at: "" }];
    expect(outreachStatus(visit, ev, true, at(24))).toMatchObject({ stage: "call_due", dueActions: [] });
  });

  it("completes as soon as the questionnaire is submitted or the call completes", () => {
    expect(outreachStatus(visit, [{ type: "questionnaire_submitted", at: "" }], true, at(50)).stage).toBe("completed");
    expect(outreachStatus(visit, [{ type: "call_completed", at: "" }], true, at(10)).stage).toBe("completed");
  });

  it("patients without MyChart wait for the call window", () => {
    expect(outreachStatus(visit, [], false, at(60))).toMatchObject({ stage: "awaiting_call", dueActions: [] });
    expect(outreachStatus(visit, [], false, at(20)).stage).toBe("call_due");
  });

  it("an unreached call is surfaced for ACTU RN follow-up and becomes overdue at V", () => {
    expect(outreachStatus(visit, [{ type: "call_unreached", at: "" }], true, at(1))).toMatchObject({ stage: "unreached", overdue: false });
    expect(outreachStatus(visit, [{ type: "call_unreached", at: "" }], true, at(-1)).overdue).toBe(true);
  });

  it("worklist puts APN-attention cases awaiting decision first, then overdue, then calls due", () => {
    expect(worklistPriority("completed", true, true, false)).toBe(0);
    expect(worklistPriority("unreached", false, false, false)).toBe(1);
    expect(worklistPriority("call_due", false, false, false)).toBe(2);
    expect(worklistPriority("completed", false, true, false)).toBe(3);
    expect(worklistPriority("invited", false, false, false)).toBe(4);
  });
});
