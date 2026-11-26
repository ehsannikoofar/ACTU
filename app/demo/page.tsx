import Link from "next/link";
import { readAudit } from "@/lib/audit";
import { now } from "@/lib/clock";
import { config } from "@/lib/config";
import { COHORT, visitAt } from "@/lib/demo/cohort";
import { formatDateTime } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { syncOutreach } from "@/lib/service";
import { getSession, validToken } from "@/lib/session";
import { enrollmentState, getState } from "@/lib/store";
import { WriteBadge } from "../components";
import { DemoControls } from "./controls";

export const dynamic = "force-dynamic";

export default async function Demo() {
  const { t, lang } = await getT();
  syncOutreach();
  const s = getState();
  const v = visitAt(s.demo.startedAt);
  const hoursToVisit = Math.round((Date.parse(v) - now().getTime()) / 3_600_000);
  const session = await getSession();
  const signedIn = config.dataSource === "offline" || validToken(session?.clinician);
  const audits = readAudit(25, undefined, s.demo.startedAt);

  return (
    <div className="stack">
      <h1>{t("demo.title")}</h1>
      <p className="lead">{t("demo.lead")}</p>
      <div className="grid grid-2">
        <section className="card" aria-labelledby="clock-h">
          <h2 id="clock-h">{t("demo.clock")}</h2>
          <p>
            {t("demo.now")}: <strong>{formatDateTime(now().toISOString(), lang)}</strong>
            <br />
            {t("demo.visit")}: <strong>{formatDateTime(v, lang)}</strong> ({t("demo.hoursToVisit", { h: hoursToVisit })})
          </p>
          <DemoControls signedIn={signedIn} />
        </section>
        <section className="card" aria-labelledby="or-h">
          <h2 id="or-h">{t("demo.orNotes")}</h2>
          <p className="small muted">{t("demo.orNotesHelp")}</p>
          <ul style={{ listStyle: "none", padding: 0 }} className="stack">
            {COHORT.map((e) => {
              const st = enrollmentState(e.id);
              const w = [...st.writes].reverse().find((x) => x.resource === "DocumentReference");
              return (
                <li key={e.id}>
                  <strong>{e.sandboxName}</strong> · {e.mychartUser ? `MyChart: ${e.mychartUser}` : t("wl.noMyChart")}{" "}
                  {st.orNote ? (
                    <span className={`badge ${st.orNote.target === "epic" ? "ok" : "neutral"}`}>{st.orNote.target === "epic" ? t("demo.orInEpic") : t("demo.orLocal")}</span>
                  ) : (
                    <span className="badge neutral">{t("demo.orNotFiled")}</span>
                  )}
                  {w && <><br /><WriteBadge w={w} t={t} /> {w.note && <span className="small muted">{w.note}</span>}</>}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <section className="card" aria-labelledby="script-h">
        <h2 id="script-h">{t("demo.script")}</h2>
        <ol>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <li key={n}>{t(`demo.step${n}`)}</li>)}
        </ol>
        <p className="row">
          <Link className="btn secondary" href="/worklist">{t("nav.worklist")}</Link>
          <Link className="btn secondary" href="/patient">{t("nav.patientApp")}</Link>
        </p>
      </section>
      <section className="card" aria-labelledby="audit-all-h">
        <h2 id="audit-all-h">{t("demo.audit")}</h2>
        <div className="table-wrap">
          <table className="data small">
            <thead>
              <tr>
                <th scope="col">{t("demo.audit.time")}</th>
                <th scope="col">{t("demo.audit.actor")}</th>
                <th scope="col">{t("demo.audit.action")}</th>
                <th scope="col">{t("demo.audit.enrollment")}</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a, i) => (
                <tr key={i}>
                  <td className="mono">{a.at.replace("T", " ").slice(0, 19)}</td>
                  <td>{a.actor.kind === "clinician" ? `${t("actor.clinician")} ${a.actor.id}` : a.actor.kind === "agent" ? t(`actor.${a.actor.name}`) : t(`actor.${a.actor.kind}`)}</td>
                  <td className="mono">{a.action}</td>
                  <td className="mono">{a.enrollmentId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
