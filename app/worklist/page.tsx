import Link from "next/link";
import { config } from "@/lib/config";
import { now } from "@/lib/clock";
import { formatDateTime } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { getSession, validToken } from "@/lib/session";
import { worklist } from "@/lib/service";
import type { AssistantResult } from "@/lib/agents/assistant";
import { StageBadge, flagText, isRedFlag } from "../components";

export const dynamic = "force-dynamic";

export default async function Worklist() {
  const { t, lang } = await getT();
  const session = await getSession();
  if (config.dataSource === "epic" && !validToken(session?.clinician)) {
    return (
      <div className="stack">
        <h1>{t("wl.title")}</h1>
        <p className="notice">{t("wl.signInNeeded")}</p>
        <a className="btn" href="/signin">{t("auth.signIn")}</a>
      </div>
    );
  }
  const { rows, epicError } = await worklist();
  const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;
  const tiles = [
    { key: "attention", n: count((r) => r.apnAttention && r.awaitingDecision), tone: "danger" },
    { key: "overdue", n: count((r) => r.status.overdue || r.status.stage === "unreached"), tone: "danger" },
    { key: "callsDue", n: count((r) => r.status.stage === "call_due"), tone: "warn" },
    { key: "awaiting", n: count((r) => r.awaitingDecision), tone: "" },
    { key: "decided", n: count((r) => r.state.decision !== null), tone: "" },
  ];

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>{t("wl.title")}</h1>
          <p className="lead">{t("wl.lead", { now: formatDateTime(now().toISOString(), lang) })}</p>
        </div>
        <Link className="btn ghost" href="/demo">{t("wl.demoControls")}</Link>
      </div>
      {epicError && <p className="notice danger" role="alert">{t("wl.epicError")} <span className="mono">{epicError}</span></p>}

      <section aria-label={t("wl.summary")} className="tiles">
        {tiles.map((x) => (
          <div key={x.key} className={`tile ${x.n > 0 ? x.tone : ""}`}>
            <div className="n">{x.n}</div>
            <div className="small">{t(`wl.tile.${x.key}`)}</div>
          </div>
        ))}
      </section>

      <div className="card table-wrap">
        <table className="data">
          <caption className="sr-only">{t("wl.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("wl.col.patient")}</th>
              <th scope="col">{t("wl.col.visit")}</th>
              <th scope="col">{t("wl.col.outreach")}</th>
              <th scope="col">{t("wl.col.flags")}</th>
              <th scope="col">{t("wl.col.index")}</th>
              <th scope="col">{t("wl.col.decision")}</th>
              <th scope="col"><span className="sr-only">{t("wl.col.action")}</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const a = r.state.assistant as AssistantResult | null;
              const red = a?.suitability.flags.filter(isRedFlag) ?? [];
              const gly = a?.suitability.flags.find((f) => f.kind === "glycemia");
              return (
                <tr key={r.enrollment.id} className={r.apnAttention && r.awaitingDecision ? "attention" : undefined}>
                  <td>
                    <strong>{r.name}</strong>
                    <br />
                    <span className="small muted">{t(`proc.${r.enrollment.procedure.code}`)} · {t("wl.synthetic")}</span>
                    {r.nameSource === "unavailable" && <><br /><span className="badge warn">{t("wl.nameUnavailable")}</span></>}
                  </td>
                  <td>{formatDateTime(r.visitAt, lang)}{r.status.overdue && <><br /><span className="badge danger">{t("wl.overdue")}</span></>}</td>
                  <td>
                    <StageBadge stage={r.status.stage} t={t} />
                    <br />
                    <span className="small muted">{r.enrollment.mychartUser ? t("wl.hasMyChart") : t("wl.noMyChart")}</span>
                  </td>
                  <td>
                    {red.map((f, i) => <div key={i}><span className="badge danger">{t("wl.redFlag")}</span> <span className="small">{flagText(f, t)}</span></div>)}
                    {gly && <div><span className="badge warn">{t("wl.glycemia")}</span></div>}
                    {!a && r.status.stage === "completed" && <span className="badge info">{t("wl.readyForAssistant")}</span>}
                    {a && red.length === 0 && !gly && <span className="small muted">{t("wl.noFlags")}</span>}
                  </td>
                  <td>{r.score !== null ? <strong>{r.score}<span className="small muted">/100</span></strong> : <span className="muted">—</span>}</td>
                  <td>{r.state.decision ? <span className="badge ok">{t(`route.${r.state.decision.route}`)}</span> : r.awaitingDecision ? <span className="badge warn">{t("wl.awaitingApn")}</span> : <span className="muted">—</span>}</td>
                  <td><Link className="btn small secondary" href={`/patients/${r.enrollment.id}`} aria-label={t("wl.reviewLabel", { name: r.name })}>{t("wl.review")}</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted">{t("wl.footnote")}</p>
    </div>
  );
}
