import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { destroySession } from "@/lib/session";

export async function POST(req: Request) {
  await destroySession();
  audit({ actor: { kind: "system" }, action: "auth.logout" });
  return NextResponse.redirect(new URL("/", req.url), 303);
}
