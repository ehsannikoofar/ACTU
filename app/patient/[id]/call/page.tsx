import Link from "next/link";
import { notFound } from "next/navigation";
import { config } from "@/lib/config";
import { SYNTHETIC_PHOTOS, enrollmentById } from "@/lib/demo/cohort";
import { getT } from "@/lib/i18n/server";
import { getSession, validToken } from "@/lib/session";
import { CallScreen } from "./call-screen";

export const dynamic = "force-dynamic";

export default async function CallPage(props: PageProps<"/patient/[id]/call">) {
  const { id } = await props.params;
  const e = enrollmentById(id);
  if (!e) notFound();
  const { t } = await getT();
  const session = await getSession();
  const authorised = config.dataSource === "offline" || validToken(session?.clinician);
  return (
    <div className="stack">
      <p><Link href="/patient">← {t("ph.allPhones")}</Link></p>
      <h1>{t("call.title", { name: e.sandboxName })}</h1>
      <p className="lead">{t("call.lead")}</p>
      {!authorised ? (
        <>
          <p className="notice">{t("call.needClinician")}</p>
          <a className="btn" href={`/api/auth/login/clinician?returnTo=/patient/${e.id}/call`}>{t("auth.signIn")}</a>
        </>
      ) : (
        <CallScreen enrollmentId={e.id} photos={[...SYNTHETIC_PHOTOS]} suggested={e.suggestedPhoto} claudeReady={config.claude.configured} />
      )}
    </div>
  );
}
