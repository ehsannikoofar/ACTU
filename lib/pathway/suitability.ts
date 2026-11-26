// Virtual-care Suitability Index (0–100) + recommendation options for the APN.
// Deterministic and explainable: AI only supplies the photo findings and the closure method.
// ILLUSTRATIVE — NOT A VALIDATED MODEL (report §8.3).
import {
  COMPLETENESS_POINTS,
  DIGITAL_PHONE_ONLY_POINTS,
  PHOTO_FINDING_THRESHOLD,
  SUITABILITY_WEIGHTS as W,
} from "./clinical-config";
import type { GlycemiaResult } from "./glycemia";
import { type Answers, type ItemId, isComplete, redFlagItems } from "./questionnaire";

export type PhotoFindingKey = "incision_opening" | "drainage" | "spreading_redness" | "protruding_suture_or_wire";
export const PHOTO_FINDING_KEYS: PhotoFindingKey[] = [
  "incision_opening",
  "drainage",
  "spreading_redness",
  "protruding_suture_or_wire",
];

export interface PhotoFinding { present: boolean; confidence: number; evidence: string }
export interface PhotoFindings {
  usable: boolean;
  findings: Record<PhotoFindingKey, PhotoFinding>;
}

export type ClosureMethod = "absorbable" | "retention_or_stay_sutures" | "unknown";

export interface SuitabilityInput {
  answers: Answers;
  photo: PhotoFindings | null; // null = no photo received
  closure: ClosureMethod;
  orNoteFound: boolean;
  glycemia: GlycemiaResult | null;
}

export interface Component { key: string; points: number; max: number; detail: string }

export type Flag =
  | { kind: "red_flag_questionnaire"; items: ItemId[] }
  | { kind: "red_flag_photo"; findings: PhotoFindingKey[] }
  | { kind: "glycemia"; reasons: GlycemiaResult["reasons"] }
  | { kind: "questionnaire_incomplete" }
  | { kind: "photo_missing_or_unusable" }
  | { kind: "closure_unknown" };

export type RouteOption =
  | "virtual_visit"
  | "phone_visit_or_local_support"
  | "local_suture_removal_plus_apn_check"
  | "in_person_actu"
  | "phone_advice";

export interface SuitabilityResult {
  score: number;
  components: Component[];
  flags: Flag[];
  apnAttention: boolean; // any red flag or glycemia flag
  digital: "video" | "phone" | "none";
  /** Ordered options the APN chooses from; the first is the assistant's suggestion. The APN always decides. */
  options: RouteOption[];
}

export function photoRedFlags(photo: PhotoFindings | null): PhotoFindingKey[] {
  if (!photo || !photo.usable) return [];
  return PHOTO_FINDING_KEYS.filter((k) => photo.findings[k].present && photo.findings[k].confidence >= PHOTO_FINDING_THRESHOLD);
}

export function digitalReadiness(a: Answers): "video" | "phone" | "none" {
  if (a.pt_willing_video_phone !== "yes") return "none";
  if (a.pt_device_camera === "yes" && a.pt_internet === "yes" && a.pt_can_send_photo === "yes") return "video";
  return "phone";
}

export function computeSuitability(input: SuitabilityInput): SuitabilityResult {
  const { answers, photo, closure, orNoteFound, glycemia } = input;
  const components: Component[] = [];
  const flags: Flag[] = [];

  // 1. Questionnaire red flags (30)
  const complete = isComplete(answers);
  const qFlags = redFlagItems(answers);
  const sixAnsweredNo = (["wound_opening", "wound_drainage_redness", "wound_protruding", "sym_fever", "sym_chest_pain_sob", "sym_dizzy_hr_bp"] as ItemId[])
    .every((id) => answers[id] === "no");
  components.push({
    key: "noQuestionnaireRedFlags",
    points: sixAnsweredNo ? W.noQuestionnaireRedFlags : 0,
    max: W.noQuestionnaireRedFlags,
    detail: qFlags.length ? `red flags: ${qFlags.join(", ")}` : sixAnsweredNo ? "all wound and symptom items answered No" : "wound/symptom items not all answered",
  });
  if (qFlags.length) flags.push({ kind: "red_flag_questionnaire", items: qFlags });
  if (!complete) flags.push({ kind: "questionnaire_incomplete" });

  // 2. Wound photo (30), scaled by confidence that each finding is absent
  let photoPoints = 0;
  if (photo && photo.usable) {
    const perFinding = PHOTO_FINDING_KEYS.map((k) => {
      const f = photo.findings[k];
      const c = Math.min(1, Math.max(0, f.confidence));
      return f.present ? 0 : c;
    });
    photoPoints = Math.round((W.woundPhotoReassuring * perFinding.reduce((s, x) => s + x, 0)) / PHOTO_FINDING_KEYS.length);
  } else {
    flags.push({ kind: "photo_missing_or_unusable" });
  }
  const pFlags = photoRedFlags(photo);
  if (pFlags.length) flags.push({ kind: "red_flag_photo", findings: pFlags });
  components.push({
    key: "woundPhotoReassuring",
    points: photoPoints,
    max: W.woundPhotoReassuring,
    detail: !photo ? "no photo received" : !photo.usable ? "photo not usable" : pFlags.length ? `concerning: ${pFlags.join(", ")}` : "no concerning findings",
  });

  // 3. Hands-on need (20)
  if (closure === "unknown") flags.push({ kind: "closure_unknown" });
  components.push({
    key: "noHandsOnNeed",
    points: closure === "absorbable" ? W.noHandsOnNeed : 0,
    max: W.noHandsOnNeed,
    detail: closure === "absorbable" ? "absorbable closure" : closure === "retention_or_stay_sutures" ? "retention/stay sutures need removal" : "closure method not found",
  });

  // 4. Digital readiness (10)
  const digital = digitalReadiness(answers);
  components.push({
    key: "digitalReadiness",
    points: digital === "video" ? W.digitalReadiness : digital === "phone" ? DIGITAL_PHONE_ONLY_POINTS : 0,
    max: W.digitalReadiness,
    detail: digital === "video" ? "video-capable" : digital === "phone" ? "phone only" : "not willing / able",
  });

  // 5. Data completeness (10)
  const completeness =
    (complete ? COMPLETENESS_POINTS.questionnaire : 0) +
    (photo && photo.usable ? COMPLETENESS_POINTS.photo : 0) +
    (orNoteFound ? COMPLETENESS_POINTS.orNote : 0);
  components.push({
    key: "dataCompleteness",
    points: completeness,
    max: W.dataCompleteness,
    detail: [complete ? "questionnaire ✓" : "questionnaire ✗", photo?.usable ? "photo ✓" : "photo ✗", orNoteFound ? "OR note ✓" : "OR note ✗"].join(" · "),
  });

  // Attention flag: glycemia (never changes the score)
  if (glycemia?.flag) flags.push({ kind: "glycemia", reasons: glycemia.reasons });

  const score = components.reduce((s, c) => s + c.points, 0);
  const redFlag = qFlags.length > 0 || pFlags.length > 0;
  const apnAttention = redFlag || Boolean(glycemia?.flag);

  // Options for the APN (first = suggestion). Red flags never auto-route: APN attention + decision.
  let options: RouteOption[];
  if (redFlag) {
    options = closure === "retention_or_stay_sutures"
      ? ["in_person_actu", "phone_advice", "local_suture_removal_plus_apn_check"]
      : ["in_person_actu", "phone_advice", "virtual_visit"];
  } else if (closure === "retention_or_stay_sutures") {
    // Owner decision D-1: show both suture options; the APN picks.
    options = ["local_suture_removal_plus_apn_check", "in_person_actu"];
  } else if (digital === "none" || digital === "phone") {
    options = ["phone_visit_or_local_support", "in_person_actu"];
  } else {
    options = ["virtual_visit", "phone_visit_or_local_support", "in_person_actu"];
  }

  return { score, components, flags, apnAttention, digital, options };
}
