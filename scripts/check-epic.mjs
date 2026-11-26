// Checks whether the Epic sandbox accepts this app's sign-in request for each client ID in .env.
// Usage:  npm run check:epic
// Read-only: sends the same GET /authorize request the app sends and reports whether Epic shows its
// login page (accepted) or the generic "Something went wrong trying to authorize the client" page.
const base = (process.env.EPIC_FHIR_BASE_URL || "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4").replace(/\/$/, "");
const app = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const conf = await (await fetch(`${base}/.well-known/smart-configuration`)).json();
const apps = [
  { role: "clinician", id: process.env.EPIC_CLINICIAN_CLIENT_ID, scope: "openid fhirUser" },
  { role: "patient", id: process.env.EPIC_PATIENT_CLIENT_ID, scope: "openid fhirUser launch/patient" },
];

let ok = true;
for (const a of apps) {
  const redirect = `${app}/api/auth/callback/${a.role}`;
  if (!a.id || a.id.startsWith("replace-with")) {
    console.log(`✗ ${a.role}: no client ID in .env`);
    ok = false;
    continue;
  }
  const u = new URL(conf.authorization_endpoint);
  u.search = new URLSearchParams({
    response_type: "code",
    client_id: a.id.trim(),
    redirect_uri: redirect,
    scope: a.scope,
    state: "check",
    aud: base,
    code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGjSTjw-cM",
    code_challenge_method: "S256",
  }).toString();
  const html = await (await fetch(u)).text();
  const rejected = html.includes("Something went wrong trying to authorize the client");
  console.log(`${rejected ? "✗" : "✓"} ${a.role}: client ${a.id.trim()}\n    redirect ${redirect}\n    ${rejected ? "Epic REJECTED the request (client ID not synced to the sandbox yet, not the Non-Production ID, or redirect URI not registered exactly)" : "Epic accepted the request (login page shown)"}`);
  if (rejected) ok = false;
}
process.exit(ok ? 0 : 1);
