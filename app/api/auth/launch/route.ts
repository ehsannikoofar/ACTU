import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { config, epicClientId, redirectUri } from "@/lib/config";
import { buildAuthorizeUrl } from "@/lib/epic/smart";
import { ensureSession } from "@/lib/session";

// SMART on FHIR EHR launch: Epic (LaunchPad on fhir.epic.com, or Hyperspace) opens
//   /api/auth/launch?iss=<FHIR base>&launch=<launch token>
// The sign-in then carries the Epic user's context, so Epic's standalone login page is not used.
// Register this URL nowhere: Epic does not check launch URLs; the redirect URI stays the same.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const iss = (url.searchParams.get("iss") ?? "").replace(/\/$/, "");
  const launch = url.searchParams.get("launch") ?? "";
  const fail = (msg: string) => NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(msg)}`, url));
  // Only accept launches from the configured Epic FHIR server — never send our client to an unknown issuer.
  if (iss !== config.epic.fhirBaseUrl) return fail(`EHR launch rejected: unexpected iss (${iss || "missing"})`);
  if (!launch || launch.length > 2048) return fail("EHR launch rejected: missing launch token");
  // Diagnostics for the presenter's Terminal: which client the launch token was issued for vs ours.
  // Prints IDs only — never the token. The token's claims are read, not trusted (Epic verifies it).
  const claims = readClaims(launch);
  const ours = epicClientId("clinician");
  console.info(
    `[EHR launch] launch token client_id=${claims.client_id ?? "?"} | our EPIC_CLINICIAN_CLIENT_ID=${ours ?? "(missing)"} | ` +
      `${claims.client_id && ours && claims.client_id !== ours ? "MISMATCH" : claims.client_id === ours ? "match" : "unknown"} | ` +
      `redirect_uri we send=${redirectUri("clinician")} | token expires=${claims.exp ? new Date(claims.exp * 1000).toISOString() : "?"}`,
  );
  try {
    const session = await ensureSession();
    const { url: authorizeUrl, pending } = await buildAuthorizeUrl("clinician", "/worklist", launch);
    session.pending = pending;
    audit({ actor: { kind: "system" }, action: "auth.clinician.ehr_launch.start" });
    return NextResponse.redirect(authorizeUrl);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "error");
  }
}

function readClaims(jwt: string): { client_id?: string; exp?: number } {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1] ?? "", "base64url").toString("utf8")) as Record<string, unknown>;
    return { client_id: typeof payload.client_id === "string" ? payload.client_id : undefined, exp: typeof payload.exp === "number" ? payload.exp : undefined };
  } catch {
    return {};
  }
}
