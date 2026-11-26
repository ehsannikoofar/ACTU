import Link from "next/link";
import { notFound } from "next/navigation";
import type { AssistantResult } from "@/lib/agents/assistant";
import { readAudit } from "@/lib/audit";
import { now } from "@/lib/clock";
import { config } from "@/lib/config";
import { enrollmentById, procedureDate, visitAt } from "@/lib/demo/cohort";
import { patientName } from "@/lib/epic/fhir";
import { formatDate, formatDateTime } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { outreachStatus } from "@/lib/pathway/outreach";
import { ITEMS } from "@/lib/pathway/questionnaire";
import { PHOTO_FINDING_KEYS } from "@/lib/pathway/suitability";
import { getSession, validToken } from "@/lib/session";
import { clinicianFhir, photoUrl, syncOutreach } from "@/lib/service";
import { enrollmentState, getState } from "@/lib/store";
import { StageBadge, WriteBadge, flagText, isRedFlag } from "../../components";
import { AssistantRunner } from "./assistant-runner";
import { DecisionForm } from "./decision-form";

export const dynamic = "force-dynamic";

export default async function PatientReview(props: PageProps<"/patients/[id]">) {
  const { id } = await props.params;
  const e = enrollmentById(id);
  if (!e) notFound();
  const { t, lang } = await getT();
  const session = await getSession();
  if (config.dataSource === "epic" && !validToken(session?.clinician)) {
    return (
      <div className="stack">
        <p className="notice">{t("wl.signInNeeded")}</p>
        <a className="btn" href={`/api/auth/login/clinician?returnTo=/patients/${id}`}>{t("auth.signIn")}</a>
      </div>
    );
  }
  syncOutreach();
  const fhir = clinicianFhir(session);
  const patient = await fhir?.read("Patient", e.fhirPatientId).catch(() => null);
  const s = getState();
  const st = enrollmentState(e.id);
  const v = visitAt(s.demo.startedAt);
  const status = outreachStatus(v, st.events, e.mychartUser !== null, now());
  const a = st.assistant as AssistantResult | null;
  const age = patient?.birthDate ? Math.floor((now().getTime() - Date.parse(patient.birthDate)) / (365.25 * 86_400_000)) : null;
  const img = photoUrl(st, e.id);
  const audits = readAudit(12, e.id, s.demo.startedAt);

  return (
    <div className="stack">
      <p><Link href="/worklist">← {t("pr.back")}</Link></p>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>{patientName(patient) ?? e.sandboxName}</h1>
          <p className="lead">
            {age !== null && `${t("pr.age", { age })} · `}
            {patient?.gender ? `${t(`sex.${patient.gender}`)} · ` : ""}
            {t(`proc.${e.procedure.code}`)} {t("pr.on")} {formatDate(procedureDate(e, s.demo.startedAt), lang)} ({t("wl.synthetic")})
            <br />
            {t("pr.visit")}: <strong>{formatDateTime(v, lang)}</strong> · {t("pr.distance", { km: e.distanceKm })}
          </p>
        </div>
        <StageBadge stage={status.stage} t={t} />
      </div>
      {!patient && <p className="notice warn">{t("pr.patientUnavailable")}</p>}

      <div className="grid grid-2">
        {/* ---------- Evidence collected by Agent 1 ---------- */}
        <div className="stack">
          <section className="card" aria-labelledby="outreach-h">
            <h2 id="outreach-h">{t("pr.outreach")}</h2>
            <ol className="timeline">
              {st.events.length === 0 && <li>{t("pr.noOutreach")}</li>}
              {st.events.map((ev, i) => (
                <li key={i} className="done">
                  <strong>{t(`event.${ev.type}`)}</strong> <span className="small muted">{formatDateTime(ev.at, lang)}</span>
                </li>
              ))}
              {status.next && status.stage !== "completed" && (
                <li className="now">{t(`next.${status.next.label}`)} · <span className="small muted">{formatDateTime(status.next.at, lang)}</span></li>
              )}
            </ol>
          </section>

          <section className="card" aria-labelledby="answers-h">
            <h2 id="answers-h">{t("pr.answers")}</h2>
            {!st.answers ? (
              <p className="muted">{t("pr.noAnswers")}</p>
            ) : (
              <>
                <p className="small muted">{t("pr.answersSource", { source: t(`source.${st.answersSource ?? "mychart"}`) })}</p>
                {(["wound", "symptoms", "patient"] as const).map((sec) => (
                  <table key={sec} className="data" style={{ marginBottom: 12 }}>
                    <caption style={{ textAlign: "left", fontWeight: 700 }}>{t(`section.${sec}`)}</caption>
                    <tbody>
                      {ITEMS.filter((i) => i.section === sec).map((i) => {
                        const ans = st.answers![i.id];
                        const concern = ans === i.concernWhen;
                        return (
                          <tr key={i.id}>
                            <th scope="row" style={{ textTransform: "none", fontSize: "0.92rem", color: "inherit", letterSpacing: 0 }}>{t(`q.${i.id}`)}</th>
                            <td style={{ width: 90 }}>
                              <span className={`badge ${concern ? (sec === "patient" ? "warn" : "danger") : "neutral"}`}>{ans ? t(`common.${ans}`) : "—"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ))}
              </>
            )}
          </section>

          <section className="card" aria-labelledby="photo-h">
            <h2 id="photo-h">{t("pr.photo")}</h2>
            {img ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="photo" src={img} alt={t("pr.photoAlt")} />
                <p className="small muted">{t("pr.photoSource", { source: t(`source.${st.photo!.source}`) })}</p>
              </>
            ) : (
              <p className="muted">{t("pr.noPhoto")}</p>
            )}
          </section>
        </div>

        {/* ---------- Agent 2 + APN decision ---------- */}
        <div className="stack">
          <section className="card" aria-labelledby="assist-h">
            <h2 id="assist-h">{t("as.title")}</h2>
            <p className="small muted">{t("as.what")}</p>
            <AssistantRunner enrollmentId={e.id} hasResult={a !== null} ready={st.answers !== null} claudeReady={config.claude.configured} />
            {a && (
              <div className="stack" style={{ marginTop: 16 }}>
                <div>
                  <h3>{t("as.index")}</h3>
                  <div className="gauge" role="img" aria-label={t("as.indexAria", { score: a.suitability.score })}>
                    <span className="score">{a.suitability.score}<span className="small muted">/100</span></span>
                    <span className="bar" aria-hidden="true"><span className="fill" style={{ display: "block", width: `${a.suitability.score}%` }} /></span>
                  </div>
                  <p className="small muted">{t("as.illustrative")}</p>
                  <div className="comp">
                    {a.suitability.components.map((c) => (
                      <div key={c.key} style={{ display: "contents" }}>
                        <span>{t(`comp.${c.key}`)} <span className="small muted">— {c.detail}</span></span>
                        <span className="pts">{c.points}/{c.max}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3>{t("as.flags")}</h3>
                  {a.suitability.flags.length === 0 ? (
                    <p className="notice ok">{t("as.noFlags")}</p>
                  ) : (
                    <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
                      {[...a.suitability.flags].sort((x, y) => Number(isRedFlag(y)) - Number(isRedFlag(x))).map((f, i) => (
                        <li key={i} className={`notice ${isRedFlag(f) ? "danger" : f.kind === "glycemia" ? "warn" : ""}`}>
                          <strong>{isRedFlag(f) ? t("as.redFlag") : f.kind === "glycemia" ? t("as.attention") : t("as.dataGap")}:</strong> {flagText(f, t)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {a.photo && (
                  <div>
                    <h3>{t("as.photoReview")}</h3>
                    <p className="small">{a.photo.description}</p>
                    <table className="data">
                      <tbody>
                        {PHOTO_FINDING_KEYS.map((k) => {
                          const f = a.photo!.findings[k];
                          return (
                            <tr key={k}>
                              <th scope="row" style={{ textTransform: "none", fontSize: "0.9rem", color: "inherit", letterSpacing: 0 }}>{t(`finding.${k}`)}</th>
                              <td><span className={`badge ${f.present ? "danger" : "ok"}`}>{f.present ? t("as.present") : t("as.absent")}</span></td>
                              <td className="small muted">{Math.round(f.confidence * 100)}% · {f.evidence}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div>
                  <h3>{t("as.chart")}</h3>
                  <p>{a.chart.summary_for_apn}</p>
                  <p className="small">
                    <strong>{t("as.closure")}:</strong> {t(`closure.${a.chart.closure_method}`)} — <q>{a.chart.closure_evidence}</q>
                    <br />
                    <span className="muted">{t("as.source")}: {a.chart.or_note_source}</span>
                  </p>
                  {a.chart.relevant_history.length > 0 && <p className="small"><strong>{t("as.history")}:</strong> {a.chart.relevant_history.join(" · ")}</p>}
                  {a.chart.medications_of_note.length > 0 && <p className="small"><strong>{t("as.meds")}:</strong> {a.chart.medications_of_note.join(" · ")}</p>}
                  {a.chart.data_gaps.length > 0 && <p className="small"><strong>{t("as.gaps")}:</strong> {a.chart.data_gaps.join(" · ")}</p>}
                </div>

                <details>
                  <summary>{t("as.trace", { n: a.trace.length })}</summary>
                  <p className="small muted">{t("as.via", { transport: a.mcpTransport, model: a.model })}</p>
                  <ul className="trace">
                    {a.trace.map((x, i) => (
                      <li key={i} className={x.ok ? "" : "err"}><span className="mono">{x.tool}</span> · {x.ms} ms<br /><span className="small muted">{x.source ?? "—"}</span></li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="decision-h">
            <h2 id="decision-h">{t("dec.title")}</h2>
            <DecisionForm
              enrollmentId={e.id}
              options={a?.suitability.options ?? ["virtual_visit", "phone_visit_or_local_support", "local_suture_removal_plus_apn_check", "in_person_actu", "phone_advice"]}
              suggested={a?.suitability.options[0] ?? null}
              existing={st.decision}
              distanceKm={e.distanceKm}
            />
          </section>

          <section className="card" aria-labelledby="writes-h">
            <h2 id="writes-h">{t("pr.writes")}</h2>
            {st.writes.length === 0 ? <p className="muted small">{t("pr.noWrites")}</p> : (
              <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
                {st.writes.map((w, i) => (
                  <li key={i}><WriteBadge w={w} t={t} />{w.note && <span className="small muted"> {w.note}</span>}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" aria-labelledby="audit-h">
            <h2 id="audit-h">{t("pr.audit")}</h2>
            <ul className="small" style={{ paddingLeft: 18 }}>
              {audits.map((x, i) => (
                <li key={i}><span className="mono">{x.at.slice(11, 19)}</span> · {x.actor.kind === "clinician" ? `${t("actor.clinician")} ${x.actor.id}` : x.actor.kind === "agent" ? t(`actor.${x.actor.name}`) : t(`actor.${x.actor.kind}`)} · <span className="mono">{x.action}</span></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
