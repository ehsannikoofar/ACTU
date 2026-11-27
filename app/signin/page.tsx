import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { CopyField } from "./copy-field";

// Clinician sign-in options. Epic's standalone clinician login page fails to load its own assets in the
// sandbox (HTTP 404 from Epic, seen 2026-11-26/27), so launching from Epic's LaunchPad is the primary path.
export default async function SignIn() {
  const { t } = await getT();
  const launchUrl = `${config.appBaseUrl}/api/auth/launch`;
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <h1>{t("si.title")}</h1>
      <section className="card stack" aria-labelledby="si-a">
        <h2 id="si-a">{t("si.launchpad")} <span className="badge ok">{t("si.recommended")}</span></h2>
        <ol className="stack">
          <li>
            {t("si.step1")}{" "}
            <a href="https://fhir.epic.com/Documentation?docId=testingguide" target="_blank" rel="noopener noreferrer">{t("si.openGuide")}</a>
          </li>
          <li>{t("si.step2")}</li>
          <li>
            {t("si.step3")}
            <CopyField value={launchUrl} label={t("si.launchUrl")} copyLabel={t("si.copy")} copiedLabel={t("si.copied")} />
          </li>
          <li>{t("si.step4")}</li>
        </ol>
        <p className="small muted">{t("si.expiry")}</p>
      </section>
      <section className="card stack" aria-labelledby="si-b">
        <h2 id="si-b">{t("si.standalone")}</h2>
        <p className="small muted">{t("si.standaloneNote")}</p>
        <p><a className="btn secondary" href="/api/auth/login/clinician?returnTo=/worklist">{t("auth.signIn")}</a></p>
      </section>
    </div>
  );
}
