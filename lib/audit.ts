// Server-side audit log of clinical actions: who, what, when (append-only JSONL, gitignored).
// Never write tokens, names, or free-text clinical content here — only IDs and action codes.
import "server-only";
import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), "data", "audit.jsonl");

export type Actor =
  | { kind: "clinician"; id: string } // Practitioner FHIR id or Epic user id
  | { kind: "patient"; enrollmentId: string }
  | { kind: "agent"; name: "outreach" | "decision-assistant" }
  | { kind: "system" };

export interface AuditEntry {
  at: string; // real wall-clock time
  demoAt?: string; // demo-clock time, if different
  actor: Actor;
  action: string; // e.g. "assistant.run", "decision.recorded", "fhir.write"
  enrollmentId?: string;
  detail?: Record<string, string | number | boolean | null>;
}

export function audit(entry: Omit<AuditEntry, "at">): void {
  const line: AuditEntry = { at: new Date().toISOString(), ...entry };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.appendFileSync(FILE, JSON.stringify(line) + "\n");
}

export function readAudit(limit = 200, enrollmentId?: string, since?: string): AuditEntry[] {
  try {
    const lines = fs.readFileSync(FILE, "utf8").trim().split("\n").filter(Boolean);
    const all = lines.map((l) => JSON.parse(l) as AuditEntry);
    return all
      .filter((e) => (!enrollmentId || e.enrollmentId === enrollmentId) && (!since || e.at >= since))
      .slice(-limit)
      .reverse();
  } catch {
    return [];
  }
}
