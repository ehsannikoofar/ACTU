// Pre-visit screening questionnaire — Table 10 of the report / slide 8.
// Pure data: safe for client and server. Labels live in lib/i18n/*.json under "q.<id>".

export type Section = "wound" | "symptoms" | "patient";

export type ItemId =
  | "wound_opening"
  | "wound_drainage_redness"
  | "wound_protruding"
  | "sym_fever"
  | "sym_chest_pain_sob"
  | "sym_dizzy_hr_bp"
  | "pt_device_camera"
  | "pt_internet"
  | "pt_can_send_photo"
  | "pt_willing_video_phone";

export interface Item {
  id: ItemId;
  section: Section;
  /** Wound/Symptoms: a "yes" is a red flag. Patient: a "no" is a digital-readiness barrier. */
  concernWhen: "yes" | "no";
}

export const ITEMS: readonly Item[] = [
  { id: "wound_opening", section: "wound", concernWhen: "yes" },
  { id: "wound_drainage_redness", section: "wound", concernWhen: "yes" },
  { id: "wound_protruding", section: "wound", concernWhen: "yes" },
  { id: "sym_fever", section: "symptoms", concernWhen: "yes" },
  { id: "sym_chest_pain_sob", section: "symptoms", concernWhen: "yes" },
  { id: "sym_dizzy_hr_bp", section: "symptoms", concernWhen: "yes" },
  { id: "pt_device_camera", section: "patient", concernWhen: "no" },
  { id: "pt_internet", section: "patient", concernWhen: "no" },
  { id: "pt_can_send_photo", section: "patient", concernWhen: "no" },
  { id: "pt_willing_video_phone", section: "patient", concernWhen: "no" },
] as const;

export const ITEM_IDS = ITEMS.map((i) => i.id);

export type Answer = "yes" | "no";
export type Answers = Partial<Record<ItemId, Answer>>;

export function isComplete(a: Answers): boolean {
  return ITEMS.every((i) => a[i.id] === "yes" || a[i.id] === "no");
}

/** Items in Wound/Symptoms answered "yes" (red flags). */
export function redFlagItems(a: Answers): ItemId[] {
  return ITEMS.filter((i) => i.section !== "patient" && a[i.id] === "yes").map((i) => i.id);
}

/** Items in Patient answered "no" (digital-readiness barriers). */
export function barrierItems(a: Answers): ItemId[] {
  return ITEMS.filter((i) => i.section === "patient" && a[i.id] === "no").map((i) => i.id);
}
