// App-only state (not clinical record of truth) persisted to data/state.json (gitignored).
// Single-process demo store; good enough for a laptop PoC, swap for a DB in production.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { OutreachEvent } from "@/lib/pathway/outreach";
import type { Answers } from "@/lib/pathway/questionnaire";
import type { RouteOption } from "@/lib/pathway/suitability";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "state.json");

export type WriteTarget = "epic" | "local";
export interface WriteRecord {
  at: string;
  resource: string; // e.g. "QuestionnaireResponse"
  target: WriteTarget;
  epicId?: string;
  status: "created" | "failed" | "local_only";
  note?: string; // reason for failure / fallback (no PHI)
}

export interface CallTurn { role: "agent" | "patient"; text: string; at: string }

export interface EnrollmentState {
  events: OutreachEvent[];
  answers: Answers | null;
  answersSource?: "mychart" | "call";
  photo: { file: string; source: "mychart" | "call"; at: string } | null;
  call: { id: string; turns: CallTurn[]; video: boolean | null; lang: "en" | "fr"; draft: Answers; photoCaptured: boolean; ended: boolean } | null;
  assistant: unknown | null; // AssistantResult (lib/agents/assistant.ts)
  decision: { route: RouteOption; note: string; by: string; at: string } | null;
  orNote: { target: WriteTarget; epicId?: string } | null;
  writes: WriteRecord[];
}

export interface AppState {
  demo: { startedAt: string; clockOffsetMs: number };
  enrollments: Record<string, EnrollmentState>;
}

export function emptyEnrollment(): EnrollmentState {
  return { events: [], answers: null, photo: null, call: null, assistant: null, decision: null, orNote: null, writes: [] };
}

function fresh(): AppState {
  return { demo: { startedAt: new Date().toISOString(), clockOffsetMs: 0 }, enrollments: {} };
}

const g = globalThis as unknown as { __actuState?: AppState };

export function getState(): AppState {
  if (!g.__actuState) {
    try {
      g.__actuState = JSON.parse(fs.readFileSync(FILE, "utf8")) as AppState;
    } catch {
      g.__actuState = fresh();
    }
  }
  return g.__actuState;
}

function persist(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(getState(), null, 2));
  fs.renameSync(tmp, FILE);
}

export function enrollmentState(id: string): EnrollmentState {
  const s = getState();
  s.enrollments[id] ??= emptyEnrollment();
  return s.enrollments[id];
}

export function update<T>(fn: (s: AppState) => T): T {
  const result = fn(getState());
  persist();
  return result;
}

export function resetState(): void {
  g.__actuState = fresh();
  const photos = path.join(DATA_DIR, "photos");
  fs.rmSync(photos, { recursive: true, force: true });
  persist();
}

export const PHOTO_DIR = path.join(DATA_DIR, "photos");
