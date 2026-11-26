// Server-side sessions. The browser holds only an opaque random ID in an httpOnly cookie;
// OAuth tokens never leave the server (no localStorage, no client JS access).
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export interface EpicToken {
  accessToken: string;
  expiresAt: number; // epoch ms
  scope: string;
  fhirUser?: string; // e.g. "Practitioner/abc" or "Patient/xyz"
  patientId?: string; // patient launch context
}

export interface PendingAuth {
  role: "clinician" | "patient";
  state: string;
  verifier: string;
  returnTo: string;
  createdAt: number;
}

export interface Session {
  id: string;
  clinician?: EpicToken;
  patient?: EpicToken;
  pending?: PendingAuth;
}

const COOKIE = "actu_sid";
const g = globalThis as unknown as { __actuSessions?: Map<string, Session> };
const sessions = (g.__actuSessions ??= new Map<string, Session>());

export async function getSession(): Promise<Session | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  return id ? sessions.get(id) ?? null : null;
}

/** Returns the current session, creating one (and setting the cookie) if needed. Route handlers only. */
export async function ensureSession(): Promise<Session> {
  const existing = await getSession();
  if (existing) return existing;
  const id = crypto.randomBytes(32).toString("base64url");
  const s: Session = { id };
  sessions.set(id, s);
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return s;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) sessions.delete(id);
  jar.delete(COOKIE);
}

export function validToken(t: EpicToken | undefined): t is EpicToken {
  return t !== undefined && t.expiresAt - 30_000 > Date.now();
}
