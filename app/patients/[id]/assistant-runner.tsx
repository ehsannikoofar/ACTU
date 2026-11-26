"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AssistantEvent } from "@/lib/agents/assistant";
import { useI18n } from "../../i18n-client";

type StepKey = "photo" | "chart" | "glycemia" | "index";
type StepState = "idle" | "run" | "done" | "skip";

export function AssistantRunner({ enrollmentId, hasResult, ready, claudeReady }: { enrollmentId: string; hasResult: boolean; ready: boolean; claudeReady: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Record<StepKey, StepState>>({ photo: "idle", chart: "idle", glycemia: "idle", index: "idle" });
  const [tools, setTools] = useState<{ tool: string; ok: boolean; source: string | null; ms: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function run() {
    setRunning(true);
    setError(null);
    setTools([]);
    setSteps({ photo: "idle", chart: "idle", glycemia: "idle", index: "idle" });
    setStatus(t("as.running"));
    try {
      const res = await fetch(`/api/patients/${enrollmentId}/assistant`, { method: "POST" });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const ev = JSON.parse(p.slice(6)) as AssistantEvent;
          if (ev.type === "step") {
            setSteps((s) => ({ ...s, [ev.step]: ev.status === "start" ? "run" : ev.status === "done" ? "done" : "skip" }));
            if (ev.status === "start") setStatus(t(`as.step.${ev.step}`));
          } else if (ev.type === "tool") {
            setTools((x) => [...x, ev]);
          } else if (ev.type === "error") {
            setError(ev.message);
          } else if (ev.type === "result") {
            setStatus(t("as.finished"));
            router.refresh();
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setRunning(false);
    }
  }

  const showProgress = running || tools.length > 0 || error;
  return (
    <div>
      {!claudeReady && <p className="notice warn">{t("as.noKey")}</p>}
      {!ready && <p className="notice">{t("as.notReady")}</p>}
      <button className="btn" onClick={run} disabled={running || !ready || !claudeReady} aria-describedby="as-status">
        {running ? t("as.runningBtn") : hasResult ? t("as.rerun") : t("as.run")}
      </button>
      <p id="as-status" className="small muted" role="status" aria-live="polite">{status}</p>
      {showProgress && (
        <div>
          <ol className="steps" aria-label={t("as.progress")}>
            {(["photo", "chart", "glycemia", "index"] as StepKey[]).map((k) => (
              <li key={k}>
                <span className={`dot ${steps[k] === "run" ? "run" : steps[k] === "done" ? "done" : steps[k] === "skip" ? "skip" : ""}`} aria-hidden="true" />
                {t(`as.step.${k}`)}
                <span className="sr-only">: {t(`as.state.${steps[k]}`)}</span>
              </li>
            ))}
          </ol>
          {tools.length > 0 && (
            <ul className="trace" aria-label={t("as.liveTrace")}>
              {tools.map((x, i) => (
                <li key={i} className={x.ok ? "" : "err"}>
                  <span className="mono">MCP → {x.tool}</span> · {x.ms} ms
                  <br />
                  <span className="small muted">{x.source ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="notice danger" role="alert">{error}</p>}
    </div>
  );
}
