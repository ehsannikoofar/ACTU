import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { exchangeCode } from "@/lib/epic/smart";
import { getSession } from "@/lib/session";

export async function GET(req: Request, ctx: RouteContext<"/api/auth/callback/[role]">) {
  const { role } = await ctx.params;
  const url = new URL(req.url);
  const fail = (msg: string) => NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(msg)}`, url));
  const session = await getSession();
  const pending = session?.pending;
  if (!session || !pending || pending.role !== role) return fail("No sign-in in progress (session expired?)");
  session.pending = undefined;
  if (url.searchParams.get("error")) return fail(`Epic returned: ${url.searchParams.get("error")}`);
  if (url.searchParams.get("state") !== pending.state) return fail("State mismatch — sign-in rejected");
  if (Date.now() - pending.createdAt > 10 * 60_000) return fail("Sign-in took too long — please retry");
  const code = url.searchParams.get("code");
  if (!code) return fail("No authorization code returned");
  try {
    const token = await exchangeCode(pending, code);
    if (role === "clinician") session.clinician = token;
    else session.patient = token;
    const who = token.fhirUser?.split("/").pop() ?? token.patientId ?? "unknown";
    audit({ actor: role === "clinician" ? { kind: "clinician", id: who } : { kind: "system" }, action: `auth.${role}.success`, detail: { patientContext: token.patientId ? "yes" : "no" } });
    return NextResponse.redirect(new URL(pending.returnTo, url));
  } catch (e) {
    audit({ actor: { kind: "system" }, action: `auth.${role}.failed` });
    return fail(e instanceof Error ? e.message : "Token exchange failed");
  }
}
