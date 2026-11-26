import Link from "next/link";
import { notFound } from "next/navigation";
import { now } from "@/lib/clock";
import { config } from "@/lib/config";
import { SYNTHETIC_PHOTOS, enrollmentById, visitAt } from "@/lib/demo/cohort";
import { getT } from "@/lib/i18n/server";
import { outreachStatus } from "@/lib/pathway/outreach";
import { getSession, validToken } from "@/lib/session";
import { syncOutreach } from "@/lib/service";
import { enrollmentState, getState } from "@/lib/store";
import { Phone } from "../phone";
import { CheckinForm } from "./checkin-form";

export const dynamic = "force-dynamic";

export default async function PatientPhone(props: PageProps<"/patient/[id]">) {
  const { id } = await props.params;
  const e = enrollmentById(id);
  if (!e) notFound();
  const { t, lang } = await getT();
  syncOutreach();
  const s = getState();
  const v = visitAt(s.demo.startedAt);
  const st = enrollmentState(e.id);
  const status = outreachStatus(v, st.events, e.mychartUser !== null, now());
  const session = await getSession();
  const pt = validToken(session?.patient) ? session!.patient! : null;
  const signedInAsThis = config.dataSource === "offline" || pt?.patientId === e.fhirPatientId;
  const open = e.mychartUser && ["invited", "reminded", "call_due"].includes(status.stage);

  return (
    <div className="stack">
      <p><Link href="/patient">← {t("ph.allPhones")}</Link></p>
      <Phone e={e} name={e.sandboxName} status={status} st={st} visit={v} t={t} lang={lang}>
        {open && !signedInAsThis && (
          <div className="stack">
            <p className="small">{t("ph.signInPrompt")}</p>
            <a className="btn" href={`/api/auth/login/patient?returnTo=/patient/${e.id}`}>{t("ph.signIn")}</a>
            <p className="small muted">{t("ph.signInHint", { user: e.mychartUser! })}</p>
            {pt && <p className="notice warn small">{t("ph.wrongPatient")}</p>}
          </div>
        )}
        {open && signedInAsThis && <CheckinForm enrollmentId={e.id} photos={[...SYNTHETIC_PHOTOS]} suggested={e.suggestedPhoto} />}
      </Phone>
    </div>
  );
}
