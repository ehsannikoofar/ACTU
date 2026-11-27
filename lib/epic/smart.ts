// SMART on FHIR standalone launch (public client + PKCE S256) against Epic.
// Verified against the sandbox's /.well-known/smart-configuration on 2026-11-26:
// capabilities include launch-standalone, client-public; code_challenge_methods S256.
import "server-only";
import crypto from "node:crypto";
import { config, epicClientId, redirectUri } from "@/lib/config";
import type { EpicToken, PendingAuth } from "@/lib/session";

interface SmartConfig { authorization_endpoint: string; token_endpoint: string }
let cached: SmartConfig | null = null;

export async function smartConfig(): Promise<SmartConfig> {
  if (cached) return cached;
  const res = await fetch(`${config.epic.fhirBaseUrl}/.well-known/smart-configuration`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`SMART discovery failed: HTTP ${res.status}`);
  const j = (await res.json()) as SmartConfig;
  cached = { authorization_endpoint: j.authorization_endpoint, token_endpoint: j.token_endpoint };
  return cached;
}

const SCOPES: Record<PendingAuth["role"], string> = {
  // Epic grants resource access from the APIs selected on the app registration.
  clinician: "openid fhirUser",
  patient: "openid fhirUser launch/patient",
};

/**
 * Standalone launch, or — when `launch` is given — an EHR launch (Epic LaunchPad / Hyperspace),
 * which carries the signed-in Epic user and skips Epic's login page.
 */
export async function buildAuthorizeUrl(role: PendingAuth["role"], returnTo: string, launch?: string): Promise<{ url: string; pending: PendingAuth }> {
  const clientId = epicClientId(role);
  if (!clientId) throw new Error(`EPIC_${role.toUpperCase()}_CLIENT_ID is not configured`);
  const { authorization_endpoint } = await smartConfig();
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(24).toString("base64url");
  const u = new URL(authorization_endpoint);
  u.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(role),
    scope: launch ? "launch openid fhirUser" : SCOPES[role],
    ...(launch ? { launch } : {}),
    state,
    aud: config.epic.fhirBaseUrl,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return { url: u.toString(), pending: { role, state, verifier, returnTo, createdAt: Date.now() } };
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  patient?: string;
  id_token?: string;
}

function fhirUserFromIdToken(idToken?: string): string | undefined {
  if (!idToken) return undefined;
  try {
    // We only read the fhirUser claim to show who is signed in; the token came straight from Epic's token endpoint over TLS.
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8")) as { fhirUser?: string };
    return payload.fhirUser;
  } catch {
    return undefined;
  }
}

export async function exchangeCode(pending: PendingAuth, code: string): Promise<EpicToken> {
  const clientId = epicClientId(pending.role)!;
  const { token_endpoint } = await smartConfig();
  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(pending.role),
      client_id: clientId,
      code_verifier: pending.verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // Body may contain an OAuth error code; it never contains a token on failure.
    const body = await res.text();
    throw new Error(`Token exchange failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const t = (await res.json()) as TokenResponse;
  const fhirUser = fhirUserFromIdToken(t.id_token);
  return {
    accessToken: t.access_token,
    expiresAt: Date.now() + t.expires_in * 1000,
    scope: t.scope,
    fhirUser,
    patientId: t.patient,
  };
}
