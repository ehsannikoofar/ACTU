// Server component: one simulated MyChart-style phone screen for an enrolled patient.
import Link from "next/link";
import type { Enrollment } from "@/lib/demo/cohort";
import { type Lang, formatDateTime } from "@/lib/i18n";
import type { OutreachStatus } from "@/lib/pathway/outreach";
import type { EnrollmentState } from "@/lib/store";

type T = (key: string, vars?: Record<string, string | number>) => string;

export function Phone({ e, name, status, st, visit, t, lang, children }: {
  e: Enrollment; name: string; status: OutreachStatus; st: EnrollmentState; visit: string; t: T; lang: Lang; children?: React.ReactNode;
}) {
  const invite = st.events.find((x) => x.type === "invite_sent");
  const reminder = st.events.find((x) => x.type === "reminder_sent");
  const checkinOpen = e.mychartUser && (status.stage === "invited" || status.stage === "reminded" || status.stage === "call_due");
  return (
    <section className="phone" aria-label={t("ph.phoneOf", { name })}>
      <div className="phone-bar">
        <span>{e.mychartUser ? t("ph.portal") : t("ph.phone")}</span>
        <small>{name}</small>
      </div>
      <div className="phone-body">
        <p className="sim-tag">{t("ph.simulated")}</p>
        <p className="small">{t("ph.visit", { when: formatDateTime(visit, lang) })}</p>

        {status.stage === "call_due" && (
          <div className="notif new" role="status">
            <strong>📞 {t("ph.incoming")}</strong>
            <p className="small">{t("ph.incomingFrom")}</p>
            <div className="row">
              <Link className="btn ok small" href={`/patient/${e.id}/call`}>{t("ph.answer")}</Link>
            </div>
          </div>
        )}
        {reminder && status.stage !== "completed" && (
          <div className="notif new">
            <strong>{t("ph.reminderTitle")}</strong>
            <p className="small">{t("ph.reminderBody")}</p>
            <span className="small muted">{formatDateTime(reminder.at, lang)}</span>
          </div>
        )}
        {invite && (
          <div className={`notif ${status.stage === "completed" ? "" : "new"}`}>
            <strong>{t("ph.inviteTitle")}</strong>
            <p className="small">{t("ph.inviteBody")}</p>
            <span className="small muted">{formatDateTime(invite.at, lang)}</span>
          </div>
        )}
        {checkinOpen && !children && (
          <Link className="btn" href={`/patient/${e.id}`}>{t("ph.openCheckin")}</Link>
        )}
        {status.stage === "scheduled" && <p className="muted small">{t("ph.nothingYet")}</p>}
        {status.stage === "awaiting_call" && <p className="muted small">{t("ph.noPortal")}</p>}
        {status.stage === "completed" && <p className="notice ok small">{t("ph.thanks")}</p>}
        {status.stage === "unreached" && <p className="notice warn small">{t("ph.missed")}</p>}
        {children}
      </div>
    </section>
  );
}
