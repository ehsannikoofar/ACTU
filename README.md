# ACTU Virtual Follow-Up — AI-assisted pre-visit screening (proof of concept)

A demonstration for an MHA residency presentation, built on the clinical pathway in
*Virtual Follow-Up After Sternal Wire–Related Procedures* (UOHI, ACTU). Two AI agents support the
pre-visit step before the ~2-week follow-up:

| Agent | What it does |
|---|---|
| **1 · Outreach Agent** | **V−72 h** sends the MyChart-style questionnaire + wound-photo request · **V−48 h** reminder if no response · **V−24 h** calls the patient (video if they agree, otherwise voice) and collects the 10 answers and, over video, a photo. Gives no clinical advice; every call opens with the 911 safety sentence. |
| **2 · Clinical Decision Assistant** | Analyses the wound photo (Claude vision) and the questionnaire, researches the Epic chart through **MCP tools** (history, OR note, labs, vitals, meds), then calculates the **Virtual-care Suitability Index (0–100)** with reasons and flags. **The APN decides.** |

> **Synthetic data only.** Epic sandbox *test* patients, invented procedures/OR notes, and
> computer-generated wound images watermarked "SYNTHETIC". No real patient data. Not for clinical use.
> The Suitability Index is illustrative and **not validated**.

---

## 1. Quick start (your laptop)

Requirements: **Node.js 20.9+** (22 LTS recommended) and **Chrome or Edge** (voice recognition for the call screen).

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env` (see §3), then:

```bash
npm run dev
```

Open <http://localhost:3000>. The home page shows a **Setup status** checklist.

Rehearse without Epic or Wi-Fi (sample data, agents still need the Claude key):

```bash
DATA_SOURCE=offline npm run dev
```

---

## 2. Register the Epic apps (fhir.epic.com, ~15 min, one time)

Sign in at <https://fhir.epic.com/> → **Build Apps** → **Create**. Create **two** apps. For both:
**R4**, **do not** tick "confidential client" (this app is a *public client with PKCE* — no secret to manage),
then **Save** and **Mark Ready for Sandbox**. Changes can take **up to 1 hour** to reach the sandbox.

**App 1 — "ACTU Follow-Up (Clinician)"**
- Application audience: *Clinicians or Administrative Users*
- Redirect URI: `http://localhost:3000/api/auth/callback/clinician`
- APIs (R4): Patient.Read, Patient.Search · Condition.Search (Problems) · Observation.Search (Labs) · Observation.Search (Vital Signs) · MedicationRequest.Search · Encounter.Search · DocumentReference.Search/Read (Clinical Notes) · **DocumentReference.Create (Clinical Notes)** · Binary.Read (Clinical Notes)

**App 2 — "ACTU Follow-Up (Patient)"**
- Application audience: *Patients*
- Redirect URI: `http://localhost:3000/api/auth/callback/patient`
- APIs (R4): Patient.Read (Demographics) — that is all the patient app needs. (Epic does not offer patient apps any way to save a custom questionnaire; see §7.)

Copy each app's **Non-Production Client ID** into `.env`. Then check that the sandbox accepts them:

```bash
npm run check:epic
```

✓ means Epic shows its login page; ✗ means Epic shows "Something went wrong trying to authorize the client" (client ID not synced yet, not the Non-Production ID, or redirect URI not registered exactly). (API names on the Epic site may be worded
slightly differently; pick the R4 versions closest to the list above.)

If you later host the app (e.g. a web address for the committee), add that address's
`/api/auth/callback/clinician` and `/api/auth/callback/patient` as extra redirect URIs and set `APP_BASE_URL`.

---

## 3. Environment variables (`.env`, gitignored)

| Variable | Purpose |
|---|---|
| `APP_BASE_URL` | Where the app runs; builds the OAuth redirect URIs. Default `http://localhost:3000`. |
| `EPIC_FHIR_BASE_URL` | Epic sandbox R4 base. Default `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4`. |
| `EPIC_CLINICIAN_CLIENT_ID` | Non-production client ID of App 1. |
| `EPIC_PATIENT_CLIENT_ID` | Non-production client ID of App 2. |
| `DATA_SOURCE` | `epic` (live sandbox) or `offline` (bundled sample data, no Epic calls). |
| `EPIC_MCP_URL` | Leave empty. When Epic ships its MCP connectors, put the URL here and Agent 2 connects to it instead of the built-in bridge. |
| `ANTHROPIC_API_KEY` | Claude API key (both agents). From console.anthropic.com. |
| `CLAUDE_MODEL` | Default `claude-opus-5-5`. |

Never commit `.env`. Never paste keys or passwords into chat or code.

---

## 4. Sandbox test accounts

You type these **only on Epic's own login page**. Passwords are on Epic's public
[Sandbox Test Data page](https://fhir.epic.com/Documentation?docId=testpatients).

| Role in the demo | Epic sandbox account | Demo enrollment |
|---|---|---|
| APN / clinician | `FHIRTWO` (provider-facing user with a linked provider record) | — |
| Patient, completes MyChart check-in | MyChart `fhircamila` (Camila Lopez) | `enr-01` — absorbable closure |
| Patient, no response → agent video call | MyChart `fhirderrick` (Derrick Lin) | `enr-02` — retention sutures |
| Patient, reports drainage | MyChart `fhirdesiree` (Desiree Powell) | `enr-03` — red flag |
| Patient without MyChart → voice call | — (Warren McGinnis) | `enr-04` |

Procedures, dates, OR notes, distances and photos are **synthetic** (`lib/demo/cohort.ts`); names and
chart data are read **live** from the sandbox.

---

## 5. Demo script (~6 minutes)

The **Demo controls** page has the clock buttons and the same script.

1. **Sign in with Epic** (FHIRTWO). On *Demo controls*, click **File synthetic OR notes to Epic** (tests `DocumentReference.Create`).
2. **Jump to V−72 h** → *Patient phones*: three MyChart invitations appear.
3. Camila: **Open check-in** → **Sign in with MyChart** (`fhircamila`) → answer, pick *Healing well* → send. Desiree: same, answer **Yes** to *drainage* and pick *Redness and drainage*. (Each MyChart login replaces the previous patient login in this browser.)
4. **Jump to V−48 h** → Derrick gets a reminder.
5. **Jump to V−24 h** → Derrick's phone rings → **Answer** → speak (or click Yes/No) → agree to **video** → the synthetic camera feed shows his incision (retention sutures) → photo captured. Warren gets a voice call.
6. *Worklist* → Camila → **Run assistant**: watch the live MCP tool calls, then the index, its breakdown and flags.
7. Choose the follow-up → **Record decision** (filed to Epic as a note if permitted) → audit trail updates. Contrast Desiree (red flag for APN attention) and Derrick (both suture options shown, with distance).

Reset with **Reset demo** (the audit log on disk is kept).

---

## 6. What is real vs simulated

| Capability | Status |
|---|---|
| Clinician and patient sign-in | **Real** SMART on FHIR standalone launch (public client + PKCE S256), verified against the sandbox's `/.well-known/smart-configuration` |
| Chart reads (Patient, Condition, Observation, MedicationRequest, Encounter, DocumentReference) | **Real** FHIR R4 reads |
| Agent 2 → chart | **Real MCP** protocol to a built-in read-only **Epic FHIR MCP bridge** (`lib/mcp/`). The open.epic MCP server only serves *documentation* (no PHI); Epic's patient-data MCP connectors are announced for **Q1 2027**. Set `EPIC_MCP_URL` to switch. |
| Saving to Epic | **One clinical note per patient** (`DocumentReference.Create (Clinical Notes)`, clinician app) when the APN records the decision: the 10 answers, the assistant findings, the index and the decision. Synthetic OR notes the same way. On refusal the data stays in the app and the UI shows *why* (never silent). |
| MyChart notifications (V−72/V−48) | **Simulated** phone screens — Epic has no API for outbound MyChart notifications |
| The V−24 h call | **In-browser** voice/video; real telephony is out of scope |
| Clock | **Demo clock** you fast-forward |
| Wound photos | **Synthetic** images (`npm run images` regenerates them) |

---

## 7. Known limitations

- **Questionnaire answers are not saved as a FHIR QuestionnaireResponse.** Epic's `QuestionnaireResponse.Create (Patient-Entered Questionnaires)` is offered only to backend and clinician apps, and only accepts answers to questionnaires **built in Epic and assigned to an appointment or questionnaire series** (Epic API spec 10023). Confirmed live: the patient app was granted only `patient/Patient.read`, and the attempt returned HTTP 403. The answers are therefore filed inside the APN decision note. In a real rollout, building the questionnaire in Epic (MyChart questionnaire / flowsheet, report Table 13) would make a structured save possible.
- **Sandbox write gaps** (live CapabilityStatement): `Appointment` and `Media` are read-only — visit-type changes and photos stay local. `DocumentReference.Create (Clinical Notes)` files to an encounter; the app uses the patient's most recent encounter.
- **Epic's clinician login page** failed to load its own scripts (HTTP 404 from Epic) in a live test on 2026-11-26, while MyChart login worked end to end. If you see a blank page after *Sign in with Epic*, it is on Epic's side — retry later or rehearse in offline mode.
- **Not yet run end-to-end with live Epic or Claude** in this build environment (no client IDs or API key available here). Pathway logic, UI and APIs are tested; first live run may surface Epic/Claude behaviour to adjust.
- **Clinical thresholds need sign-off**: Suitability Index weights (30/30/20/10/10, owner-approved for the demo), photo-finding threshold 0.5, glycemia flag (HbA1c > 7.0 %, glucose > 10.0 mmol/L in 14 d, coded hyperglycemia, no HbA1c in 6 months) — see `lib/pathway/clinical-config.ts`.
- **Speech recognition** uses the browser's Web Speech API; in Chrome, audio is processed by Google's speech service. Use synthetic speech only. Typed input and Yes/No buttons always work.
- Single-process file store (`data/`), in-memory sessions (restart = sign in again). Fine for a laptop demo, not for production.
- The AI never applies a decision; it can still be wrong. AI wound assessment in the literature misses findings (report §8.3).

---

## 8. Development

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

- UI strings: edit `scripts/gen_i18n.py`, then run `python3 scripts/gen_i18n.py` (regenerates `lib/i18n/en.json` and `fr.json`; tests fail if a key is missing).
- Synthetic images: `npm run images`.

```
app/                 Next.js pages (worklist, patient review, patient phones, call, demo) + API routes
lib/pathway/         Pure pathway logic: questionnaire, suitability index, glycemia flag, outreach timeline
lib/agents/          Agent 1 (outreach-call.ts) and Agent 2 (assistant.ts) on the Claude API
lib/mcp/             Read-only Epic FHIR MCP bridge (server) + MCP client
lib/epic/            SMART auth, FHIR client, write-back with local fallback, offline sample data
lib/demo/cohort.ts   Sandbox test patients + synthetic procedures / OR notes
docs/                pathway-spec.md · poc-plan.md · traceability.md
tests/               Vitest: every pathway rule, i18n completeness
```

**Security:** tokens are kept server-side only (httpOnly opaque session cookie; no localStorage); the
audit log (`data/audit.jsonl`) records who/what/when with IDs only — no tokens, names or clinical text;
state-changing routes check same-origin; `.env` and `data/` are gitignored.
