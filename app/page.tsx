import Link from "next/link";
import { config, epicClientId, redirectUri } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { getSession, validToken } from "@/lib/session";

export default async function Home(props: PageProps<"/">) {
  const { t } = await getT();
  const sp = await props.searchParams;
  const authError = typeof sp.authError === "string" ? sp.authError : null;
  const session = await getSession();
  const signedIn = validToken(session?.clinician);

  const checks: { label: string; ok: boolean; detail: string }[] = [
    { label: t("home.check.dataSource"), ok: true, detail: config.dataSource === "epic" ? t("home.check.dataSource.epic") : t("home.check.dataSource.offline") },
    { label: t("home.check.clinicianApp"), ok: config.dataSource === "offline" || epicClientId("clinician") !== null, detail: `${epicClientId("clinician") ? t("common.configured") : t("home.check.missingEnv", { name: "EPIC_CLINICIAN_CLIENT_ID" })} · ${t("home.check.redirect", { uri: redirectUri("clinician") })}` },
    { label: t("home.check.patientApp"), ok: config.dataSource === "offline" || epicClientId("patient") !== null, detail: `${epicClientId("patient") ? t("common.configured") : t("home.check.missingEnv", { name: "EPIC_PATIENT_CLIENT_ID" })} · ${t("home.check.redirect", { uri: redirectUri("patient") })}` },
    { label: t("home.check.claude"), ok: config.claude.configured, detail: config.claude.configured ? `${t("common.configured")} · ${config.claude.model}` : t("home.check.missingEnv", { name: "ANTHROPIC_API_KEY" }) },
    { label: t("home.check.mcp"), ok: true, detail: config.epic.mcpUrl ? t("home.check.mcp.remote") : t("home.check.mcp.bridge") },
  ];

  return (
    <div className="stack">
      <h1>{t("home.title")}</h1>
      <p className="lead">{t("home.lead")}</p>
      {authError && <p className="notice danger" role="alert">{t("home.authError")} {authError}</p>}

      <div className="grid grid-2">
        <section className="card" aria-labelledby="agents-h">
          <h2 id="agents-h">{t("home.agents")}</h2>
          <h3>1 · {t("home.agent1.title")}</h3>
          <p className="muted">{t("home.agent1.body")}</p>
          <h3>2 · {t("home.agent2.title")}</h3>
          <p className="muted">{t("home.agent2.body")}</p>
          <p className="notice small">{t("home.apnDecides")}</p>
          <div className="row">
            {signedIn || config.dataSource === "offline" ? (
              <Link className="btn" href="/worklist">{t("home.openWorklist")}</Link>
            ) : (
              <a className="btn" href="/signin">{t("auth.signIn")}</a>
            )}
            <Link className="btn secondary" href="/patient">{t("home.openPatientApp")}</Link>
            <Link className="btn ghost" href="/demo">{t("nav.demo")}</Link>
          </div>
        </section>

        <section className="card" aria-labelledby="setup-h">
          <h2 id="setup-h">{t("home.setup")}</h2>
          <ul className="timeline">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? "done" : ""}>
                <strong>{c.label}</strong>{" "}
                <span className={`badge ${c.ok ? "ok" : "warn"}`}>{c.ok ? t("common.ready") : t("common.actionNeeded")}</span>
                <br />
                <span className="small muted">{c.detail}</span>
              </li>
            ))}
          </ul>
          <p className="small muted">{t("home.setupHelp")}</p>
        </section>
      </div>
    </div>
  );
}
