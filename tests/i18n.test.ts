import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/en.json";
import fr from "@/lib/i18n/fr.json";
import { ITEMS } from "@/lib/pathway/questionnaire";
import { PHOTO_FINDING_KEYS } from "@/lib/pathway/suitability";
import { COHORT, SYNTHETIC_PHOTOS } from "@/lib/demo/cohort";

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? sourceFiles(p) : /\.(ts|tsx)$/.test(d.name) ? [p] : [];
  });
}

describe("i18n dictionaries", () => {
  it("EN and FR have exactly the same keys and no empty strings", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    for (const [k, v] of [...Object.entries(en), ...Object.entries(fr)]) expect(v, k).not.toBe("");
  });

  it("every literal t(\"…\") key used in the app exists", () => {
    const root = path.resolve(import.meta.dirname, "..");
    const keys = new Set<string>();
    for (const f of [...sourceFiles(path.join(root, "app")), ...sourceFiles(path.join(root, "lib"))]) {
      for (const m of fs.readFileSync(f, "utf8").matchAll(/\bt\("([a-zA-Z0-9_.]+)"/g)) keys.add(m[1]);
    }
    const missing = [...keys].filter((k) => !(k in en));
    expect(missing).toEqual([]);
  });

  it("dynamic key families are complete", () => {
    const need = [
      ...ITEMS.flatMap((i) => [`q.${i.id}`, `qshort.${i.id}`]),
      ...PHOTO_FINDING_KEYS.map((k) => `finding.${k}`),
      ...SYNTHETIC_PHOTOS.map((p) => `photo.${p}`),
      ...COHORT.map((e) => `proc.${e.procedure.code}`),
      ...["virtual_visit", "phone_visit_or_local_support", "local_suture_removal_plus_apn_check", "in_person_actu", "phone_advice"].flatMap((r) => [`route.${r}`, `routeHelp.${r}`]),
      ...["scheduled", "awaiting_call", "invited", "reminded", "call_due", "in_call", "completed", "unreached"].map((s) => `stage.${s}`),
      ...["invite_sent", "reminder_sent", "call_started", "call_completed", "call_unreached", "questionnaire_submitted"].map((s) => `event.${s}`),
    ];
    expect(need.filter((k) => !(k in en))).toEqual([]);
  });
});
