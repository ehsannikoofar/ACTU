// Small presentational helpers shared by server pages.
import type { Stage } from "@/lib/pathway/outreach";
import type { Flag } from "@/lib/pathway/suitability";
import type { WriteRecord } from "@/lib/store";

type T = (key: string, vars?: Record<string, string | number>) => string;

const STAGE_TONE: Record<Stage, string> = {
  scheduled: "neutral",
  awaiting_call: "neutral",
  invited: "info",
  reminded: "warn",
  call_due: "warn",
  in_call: "info",
  completed: "ok",
  unreached: "danger",
};

export function StageBadge({ stage, t }: { stage: Stage; t: T }) {
  return <span className={`badge ${STAGE_TONE[stage]}`}>{t(`stage.${stage}`)}</span>;
}

export function flagText(f: Flag, t: T): string {
  switch (f.kind) {
    case "red_flag_questionnaire":
      return t("flag.redQ", { items: f.items.map((i) => t(`qshort.${i}`)).join(", ") });
    case "red_flag_photo":
      return t("flag.redPhoto", { items: f.findings.map((k) => t(`finding.${k}`)).join(", ") });
    case "glycemia":
      return t("flag.glycemia", { reasons: f.reasons.map((r) => glycemiaReason(r, t)).join("; ") });
    case "questionnaire_incomplete":
      return t("flag.qIncomplete");
    case "photo_missing_or_unusable":
      return t("flag.photoMissing");
    case "closure_unknown":
      return t("flag.closureUnknown");
  }
}

export function glycemiaReason(r: Extract<Flag, { kind: "glycemia" }>["reasons"][number], t: T): string {
  switch (r.kind) {
    case "hba1c_high":
      return t("gly.hba1c", { v: r.valuePercent, d: r.date.slice(0, 10) });
    case "glucose_high":
      return t("gly.glucose", { v: r.valueMmolL, d: r.date.slice(0, 10) });
    case "coded_hyperglycemia":
      return t("gly.coded", { text: r.text });
    case "no_recent_hba1c":
      return r.lastDate ? t("gly.noRecent", { d: r.lastDate.slice(0, 10) }) : t("gly.none");
  }
}

export function isRedFlag(f: Flag): boolean {
  return f.kind === "red_flag_questionnaire" || f.kind === "red_flag_photo";
}

export function WriteBadge({ w, t }: { w: WriteRecord; t: T }) {
  const tone = w.status === "created" ? "ok" : w.status === "failed" ? "danger" : "neutral";
  return (
    <span className={`badge ${tone}`} title={w.note}>
      {w.resource} · {t(`write.${w.status}`)}
      {w.epicId ? ` · ${w.epicId.slice(0, 10)}…` : ""}
    </span>
  );
}
