import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { buildAuthorizeUrl } from "@/lib/epic/smart";
import { ensureSession } from "@/lib/session";

export async function GET(req: Request, ctx: RouteContext<"/api/auth/login/[role]">) {
  const { role } = await ctx.params;
  if (role !== "clinician" && role !== "patient") return new NextResponse("Unknown role", { status: 404 });
  const url = new URL(req.url);
  const rt = url.searchParams.get("returnTo") ?? (role === "clinician" ? "/worklist" : "/");
  const returnTo = rt.startsWith("/") && !rt.startsWith("//") ? rt : "/";
  try {
    const session = await ensureSession();
    const { url: authorizeUrl, pending } = await buildAuthorizeUrl(role, returnTo);
    session.pending = pending;
    audit({ actor: { kind: "system" }, action: `auth.${role}.start` });
    return NextResponse.redirect(authorizeUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    return NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(msg)}`, url));
  }
}
