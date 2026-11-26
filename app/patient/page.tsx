import { now } from "@/lib/clock";
import { COHORT, visitAt } from "@/lib/demo/cohort";
import { formatDateTime } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { outreachStatus } from "@/lib/pathway/outreach";
import { syncOutreach } from "@/lib/service";
import { enrollmentState, getState } from "@/lib/store";
import { Phone } from "./phone";

export const dynamic = "force-dynamic";

// Overview of every enrolled patient's (simulated) phone — what Agent 1 has sent so far.
export default async function PatientPhones() {
  const { t, lang } = await getT();
  syncOutreach();
  const s = getState();
  const v = visitAt(s.demo.startedAt);
  return (
    <div className="stack">
      <h1>{t("ph.title")}</h1>
      <p className="lead">{t("ph.lead", { now: formatDateTime(now().toISOString(), lang) })}</p>
      <div className="phones">
        {COHORT.map((e) => {
          const st = enrollmentState(e.id);
          const status = outreachStatus(v, st.events, e.mychartUser !== null, now());
          return <Phone key={e.id} e={e} name={e.sandboxName} status={status} st={st} visit={v} t={t} lang={lang} />;
        })}
      </div>
    </div>
  );
}
