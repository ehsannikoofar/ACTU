"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "../i18n-client";

export function DemoControls({ signedIn }: { signedIn: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: string; text: string } | null>(null);

  async function act(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = (await res.json()) as { error?: string; results?: Record<string, string> };
    setBusy(false);
    if (!res.ok) setMsg({ tone: "danger", text: j.error ?? `HTTP ${res.status}` });
    else if (j.results) setMsg({ tone: "ok", text: Object.entries(j.results).map(([k, v]) => `${k}: ${v}`).join(" · ") });
    else setMsg({ tone: "ok", text: t("demo.done") });
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="row">
        {[72, 48, 24, 1].map((h) => (
          <button key={h} className="btn secondary" disabled={busy} onClick={() => act({ action: "jump", hoursBeforeVisit: h })}>
            {t("demo.jump", { h })}
          </button>
        ))}
      </div>
      <div className="row">
        <button className="btn ghost" disabled={busy || !signedIn} onClick={() => act({ action: "seed-or-notes" })}>{t("demo.fileOrNotes")}</button>
        <button className="btn ghost" disabled={busy} onClick={() => act({ action: "reset" }, t("demo.resetConfirm"))}>{t("demo.reset")}</button>
      </div>
      {!signedIn && <p className="small muted">{t("demo.signInForNotes")}</p>}
      <div role="status" aria-live="polite">{msg && <p className={`notice ${msg.tone}`}>{msg.text}</p>}</div>
    </div>
  );
}
