# Traceability — pathway → screen → code → test

Rule and step IDs come from [`pathway-spec.md`](pathway-spec.md). PoC scope is in [`poc-plan.md`](poc-plan.md).

| Pathway element (report source) | Screen | Code | Test |
|---|---|---|---|
| S-01 Closure method documented (Table 11, Rec. 2) — synthetic OR note | Demo controls → *File synthetic OR notes* | `lib/demo/cohort.ts`, `lib/service.ts#seedOrNote`, `lib/epic/resources.ts#clinicalNote` | manual (needs Epic) |
| S-02 / R-01 Q1: sutures to remove? (Fig. 7) — read from OR note | Patient review → Assistant → *Closure* | `lib/agents/assistant.ts` (ChartSchema `closure_method`), MCP tool `find_operative_note` | `tests/pathway.test.ts` (retention / unknown closure scoring) |
| S-04 Screening due V−72 h; MyChart invite (slide 11) | Patient phones | `lib/pathway/outreach.ts`, `lib/service.ts#syncOutreach` | `outreach timeline` tests (invite at V−72) |
| Reminder at V−48 h (slide 11) | Patient phones | same | `sends a reminder at V−48h` |
| Agent call within 24 h; video if consented else voice | Patient phones → *Answer* → Call | `lib/agents/outreach-call.ts`, `app/api/call/[id]/route.ts`, `app/patient/[id]/call/call-screen.tsx` | `makes the call due at V−24h`; call conversation: manual (needs Claude) |
| Call opens with 911 safety sentence (owner decision) | Call | `openingLine()` (fixed text) | manual |
| S-05 Questionnaire, 10 items (Table 10) | Check-in form; Patient review | `lib/pathway/questionnaire.ts`, `app/patient/[id]/checkin-form.tsx` | `questionnaire (Table 10)` |
| R-04 Screening for every patient incl. sutures | Worklist | cohort + outreach (no bypass) | outreach tests |
| Unreached call → RN follow-up | Worklist (Overdue/unreached tile) | `outreach.ts` stage `unreached` | `an unreached call is surfaced…` |
| R-05 Red flag = any Yes in Wound/Symptoms → **APN attention, no auto-route** (owner decision) | Worklist red rows; Assistant flags | `lib/pathway/suitability.ts` | `a questionnaire red flag…`, `each symptom item is a red flag` |
| Photo finding red flag (slide 11 "incision intact on photo") | Assistant → photo review | `assistant.ts#analysePhoto`, `photoRedFlags()` | `a photo finding at/above the 0.5…`, `low-confidence…` |
| R-10 Any No in Patient section → phone visit or local support | Decision options | `digitalReadiness()`, options | `digital readiness…` |
| D-1 Sutures + well → **both** local removal + APN check **and** in-person; APN picks (owner decision) | Decision form (with distance) | `computeSuitability` options | `retention/stay sutures…BOTH suture options` |
| R-11 Patient characteristics never exclude; glycemia only flags (owner decision) | Assistant flags | `lib/pathway/glycemia.ts` | `glycemia attention flag` suite; `never changes the score` |
| Suitability Index 0–100, weights 30/30/20/10/10 (owner-approved) | Assistant → index + breakdown | `lib/pathway/suitability.ts`, `clinical-config.ts` | `scores 100…`, `components always sum…` |
| R-16 AI recommends, APN decides | Decision form (only place a route is set) | `app/api/patients/[id]/decision/route.ts` | API smoke test (manual) |
| Decision documented (Table 11) | Patient review → Epic write-back | `clinicalNote` via `writeToEpic` | manual (needs Epic) |
| Audit: who/what/when, no PHI | Patient review & Demo → audit | `lib/audit.ts` | manual check: no tokens/names in `data/audit.jsonl` |
| Bilingual EN/FR | Header toggle | `lib/i18n/*`, `scripts/gen_i18n.py` | `tests/i18n.test.ts` |
| Pilot KPIs (Table 17) | — (not in PoC scope) | — | — |
