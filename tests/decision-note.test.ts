import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/en.json";
import { decisionNoteText } from "@/lib/epic/decision-note";
import { computeSuitability } from "@/lib/pathway/suitability";
import { ITEMS, type Answers } from "@/lib/pathway/questionnaire";

const answers: Answers = {
  wound_opening: "no", wound_drainage_redness: "yes", wound_protruding: "no",
  sym_fever: "no", sym_chest_pain_sob: "no", sym_dizzy_hr_bp: "no",
  pt_device_camera: "yes", pt_internet: "no", pt_can_send_photo: "yes", pt_willing_video_phone: "yes",
};
const f = { present: false, confidence: 0.9, evidence: "" };
const photo = { usable: true, description: "Midline incision.", findings: { incision_opening: f, drainage: { ...f, present: true }, spreading_redness: f, protruding_suture_or_wire: f } };

describe("decision note filed to Epic (Option A)", () => {
  const suitability = computeSuitability({ answers, photo, closure: "absorbable", orNoteFound: true, glycemia: null });
  const text = decisionNoteText({
    route: "in_person_actu", apnNote: "Bring in tomorrow.", decidedAt: "2026-11-29T10:00:00Z",
    answers, answersSource: "mychart", photoSource: "mychart",
    assistant: { suitability, photo, chart: { closure_method: "absorbable", closure_evidence: "absorbable sutures", summary_for_apn: "Summary." } },
    labels: en,
  });

  it("contains all 10 answers with red flags and barriers marked", () => {
    for (const i of ITEMS) expect(text).toContain(en[`q.${i.id}` as keyof typeof en]);
    expect(text).toMatch(/Drainage or spreading redness\? YES {2}\[red flag\]/);
    expect(text).toMatch(/Reliable internet access\? NO {2}\[barrier\]/);
  });

  it("contains the decision, the APN note, the index, flags and the AI disclaimer", () => {
    expect(text).toContain("Decision: In-person ACTU visit");
    expect(text).toContain("APN note: Bring in tomorrow.");
    expect(text).toContain(`${suitability.score}/100`);
    expect(text).toContain("RED FLAG (patient-reported)");
    expect(text).toContain("RED FLAG (photo review)");
    expect(text).toContain("AI recommends; the APN decides.");
    expect(text).toContain("DEMONSTRATION ONLY");
  });

  it("still produces a complete note when the assistant was not run", () => {
    const t = decisionNoteText({ route: "virtual_visit", apnNote: "", decidedAt: "x", answers: null, answersSource: null, photoSource: null, assistant: null, labels: en });
    expect(t).toContain("Not completed.");
    expect(t).toContain("CLINICAL DECISION ASSISTANT: not run.");
  });
});
