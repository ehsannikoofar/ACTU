import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { canViewPhoto, enrollmentOr404 } from "@/lib/guards";
import { PHOTO_DIR, enrollmentState } from "@/lib/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/patients/[id]/photo">) {
  const e = enrollmentOr404((await ctx.params).id);
  if (!e.ok) return e.res;
  if (!(await canViewPhoto(e.value))) return NextResponse.json({ error: "not authorized" }, { status: 401 });
  const st = enrollmentState(e.value.id);
  if (!st.photo) return NextResponse.json({ error: "no photo" }, { status: 404 });
  const file = path.join(PHOTO_DIR, path.basename(st.photo.file));
  if (!fs.existsSync(file)) return NextResponse.json({ error: "no photo" }, { status: 404 });
  return new NextResponse(fs.readFileSync(file), {
    headers: { "Content-Type": file.endsWith(".jpg") ? "image/jpeg" : "image/png", "Cache-Control": "private, no-store" },
  });
}
