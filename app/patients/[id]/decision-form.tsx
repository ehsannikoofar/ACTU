"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RouteOption } from "@/lib/pathway/suitability";
import { useI18n } from "../../i18n-client";

export function DecisionForm({
  enrollmentId,
  options,
  suggested,
  existing,
  distanceKm,
}: {
  enrollmentId: string;
  options: RouteOption[];
  suggested: RouteOption | null;
  existing: { route: RouteOption; note: string; by: string; at: string } | null;
  distanceKm: number;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [route, setRoute] = useState<RouteOption | "">(existing?.route ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "danger"; text: string } | null>(null);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!route) {
      setMsg({ tone: "danger", text: t("dec.choose") });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/patients/${enrollmentId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route, note }),
    });
    const j = (await res.json()) as { error?: string; write?: { status: string; note?: string } };
    setBusy(false);
    if (!res.ok) {
      setMsg({ tone: "danger", text: j.error ?? `HTTP ${res.status}` });
      return;
    }
    setMsg({ tone: "ok", text: j.write?.status === "created" ? t("dec.savedEpic") : t("dec.savedLocal", { note: j.write?.note ?? "" }) });
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="small muted">{t("dec.help")}</p>
      <fieldset>
        <legend>{t("dec.legend")}</legend>
        {options.map((o) => (
          <label key={o} className="choice">
            <input type="radio" name="route" value={o} checked={route === o} onChange={() => setRoute(o)} />
            <span>
              <strong>{t(`route.${o}`)}</strong>
              {o === suggested && <> <span className="badge info">{t("dec.suggested")}</span></>}
              <br />
              <span className="small muted">
                {t(`routeHelp.${o}`)}
                {(o === "local_suture_removal_plus_apn_check" || o === "in_person_actu") && ` ${t("dec.distance", { km: distanceKm })}`}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <label htmlFor={`note-${enrollmentId}`}><strong>{t("dec.note")}</strong></label>
      <textarea id={`note-${enrollmentId}`} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn" type="submit" disabled={busy}>{existing ? t("dec.update") : t("dec.submit")}</button>
        {existing && <span className="small muted">{t("dec.existing", { by: existing.by })}</span>}
      </div>
      <div role="status" aria-live="polite">{msg && <p className={`notice ${msg.tone}`}>{msg.text}</p>}</div>
    </form>
  );
}
