// Connection check: call every Epic FHIR MCP bridge tool for every demo patient and summarise
// what came back (counts and sources only — no clinical content). Used from Demo controls.
import "server-only";
import { now } from "@/lib/clock";
import { COHORT, procedureDate, visitAt } from "@/lib/demo/cohort";
import type { FhirSource } from "@/lib/epic/fhir";
import { enrollmentState, getState } from "@/lib/store";
import { connectMcp } from "./client";

export async function checkMcpTools(fhir: FhirSource, bearer: string | null): Promise<Record<string, string>> {
  const s = getState();
  const out: Record<string, string> = {};
  for (const e of COHORT) {
    const st = enrollmentState(e.id);
    const mcp = await connectMcp(
      {
        fhir,
        enrollment: e,
        procedureDate: procedureDate(e, s.demo.startedAt),
        visitAt: visitAt(s.demo.startedAt),
        orNoteEpicId: st.orNote?.target === "epic" ? st.orNote.epicId ?? null : null,
        answers: st.answers,
        answersSource: st.answersSource ?? null,
        now: now(),
      },
      bearer,
    );
    try {
      const { tools } = await mcp.client.listTools();
      const parts: string[] = [];
      for (const t of tools) {
        const r = await mcp.client.callTool({ name: t.name, arguments: {} });
        const text = (r.content as { text?: string }[]).map((c) => c.text ?? "").join("");
        if (r.isError) {
          parts.push(`${t.name} ✗ ${text.slice(0, 120)}`);
          continue;
        }
        const count = text.match(/"count":\s*(\d+)/)?.[1];
        const src = text.match(/"source":\s*"([^"]+)"/)?.[1] ?? "";
        parts.push(`${t.name} ✓${count !== undefined ? ` (${count})` : ""}${src.startsWith("Local") ? " [local]" : ""}`);
      }
      out[e.id] = parts.join(" · ");
    } finally {
      await mcp.close();
    }
  }
  return out;
}
