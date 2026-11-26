"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ITEMS, type Answer, type ItemId, type Section } from "@/lib/pathway/questionnaire";
import { useI18n } from "../../i18n-client";

export function CheckinForm({ enrollmentId, photos, suggested }: { enrollmentId: string; photos: string[]; suggested: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [answers, setAnswers] = useState<Partial<Record<ItemId, Answer>>>({});
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const missing = ITEMS.filter((i) => !answers[i.id]);
    if (missing.length) {
      setMsg({ tone: "danger", text: t("ci.missing", { n: missing.length }) });
      document.getElementById(`q-${missing[0].id}`)?.focus();
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/patients/${enrollmentId}/questionnaire`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, syntheticPhoto: photo }),
    });
    const j = (await res.json()) as { error?: string; write?: { status: string; note?: string } };
    setBusy(false);
    if (!res.ok) return setMsg({ tone: "danger", text: j.error ?? `HTTP ${res.status}` });
    setMsg({ tone: "ok", text: j.write?.status === "created" ? t("ci.sentEpic") : t("ci.sentLocal", { note: j.write?.note ?? "" }) });
    router.refresh();
  }

  const sections: Section[] = ["wound", "symptoms", "patient"];
  return (
    <form onSubmit={submit} noValidate aria-labelledby="ci-h">
      <h2 id="ci-h" style={{ fontSize: "1.1rem" }}>{t("ci.title")}</h2>
      <p className="small muted">{t("ci.intro")}</p>
      {sections.map((sec) => (
        <fieldset key={sec}>
          <legend>{t(`section.${sec}`)}</legend>
          {ITEMS.filter((i) => i.section === sec).map((i) => (
            <div className="yn" key={i.id} role="radiogroup" aria-labelledby={`lbl-${i.id}`}>
              <span id={`lbl-${i.id}`}>{t(`q.${i.id}`)}</span>
              <span className="opts">
                {(["yes", "no"] as const).map((v, k) => (
                  <label className="opt" key={v}>
                    <input
                      id={k === 0 ? `q-${i.id}` : undefined}
                      type="radio"
                      name={i.id}
                      value={v}
                      checked={answers[i.id] === v}
                      onChange={() => setAnswers((a) => ({ ...a, [i.id]: v }))}
                    />
                    <span>{t(`common.${v}`)}</span>
                  </label>
                ))}
              </span>
            </div>
          ))}
        </fieldset>
      ))}
      <fieldset>
        <legend>{t("ci.photo")}</legend>
        <p className="small muted">{t("ci.photoHelp")}</p>
        <div className="row" role="radiogroup" aria-label={t("ci.photo")}>
          {photos.map((p) => (
            <label key={p} className="choice" style={{ padding: 4, margin: 0 }}>
              <input type="radio" name="photo" value={p} checked={photo === p} onChange={() => setPhoto(p)} className="sr-only" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/synthetic/${p}`} alt={t(`photo.${p}`)} width={84} height={84} style={{ objectFit: "cover", borderRadius: 6, outline: photo === p ? "3px solid var(--brand)" : "none" }} />
            </label>
          ))}
        </div>
        <p className="small muted">{t("ci.suggested", { name: t(`photo.${suggested}`) })}</p>
      </fieldset>
      <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>{t("ci.submit")}</button>
      <div role="status" aria-live="polite">{msg && <p className={`notice ${msg.tone}`}>{msg.text}</p>}</div>
    </form>
  );
}
