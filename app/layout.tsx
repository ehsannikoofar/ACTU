import type { Metadata } from "next";
import Link from "next/link";
import { config } from "@/lib/config";
import { getT } from "@/lib/i18n/server";
import { getSession, validToken } from "@/lib/session";
import { I18nProvider } from "./i18n-client";
import { LangToggle } from "./lang-toggle";
import { NavLinks } from "./nav-links";
import "./globals.css";

export const metadata: Metadata = {
  title: "ACTU Virtual Follow-Up",
  description: "Proof of concept: AI-assisted pre-visit screening for ACTU virtual follow-up. Synthetic data only.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, dict, t } = await getT();
  const session = await getSession();
  const clinician = validToken(session?.clinician) ? session!.clinician : null;
  const other = lang === "en" ? "fr" : "en";

  return (
    <html lang={lang === "fr" ? "fr-CA" : "en-CA"}>
      <body>
        <a href="#main" className="skip-link">{t("nav.skip")}</a>
        <div className="topbar" aria-hidden="true" />
        <header className="site">
          <div className="site-inner">
            <Link href="/" className="brand" aria-label={t("app.homeLabel")}>
              <span className="logo-dark-bg">
                {/* Official UOHI logo supplied by the project owner. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-ohi.svg" alt={t("app.logoAlt")} />
              </span>
              <span className="brand-divider" aria-hidden="true" />
              <span>
                <span className="brand-name">{t("app.name")}</span>
                <br />
                <span className="brand-sub">{t("app.tagline")}</span>
              </span>
            </Link>
            <NavLinks
              label={t("nav.label")}
              links={[
                { href: "/worklist", label: t("nav.worklist") },
                { href: "/patient", label: t("nav.patientApp") },
                { href: "/demo", label: t("nav.demo") },
              ]}
            />
            <div className="header-tools">
              {clinician ? (
                <form action="/api/auth/logout" method="post" className="row">
                  <span className="who">{t("auth.signedInAs", { user: clinician.fhirUser ?? "Epic user" })}</span>
                  <button className="btn ghost small" type="submit">{t("auth.signOut")}</button>
                </form>
              ) : config.dataSource === "epic" ? (
                <a className="btn small" href="/api/auth/login/clinician?returnTo=/worklist">{t("auth.signIn")}</a>
              ) : null}
              <LangToggle other={other} label={t("lang.switchLabel")} text={t("lang.switch")} />
            </div>
          </div>
        </header>
        {config.dataSource === "offline" && (
          <div className="site-inner" role="status">
            <p className="notice warn" style={{ margin: 0, width: "100%" }}>{t("banner.offline")}</p>
          </div>
        )}
        <I18nProvider lang={lang} dict={dict}>
          <main id="main" tabIndex={-1}>{children}</main>
        </I18nProvider>
        <footer className="site">
          <div className="site-inner">
            <p>{t("footer.synthetic")}</p>
            <p>{t("footer.ai")}</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
