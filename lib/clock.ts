// Demo clock: real time + an offset the presenter can fast-forward on stage.
import "server-only";
import { getState, update } from "@/lib/store";

export function now(): Date {
  return new Date(Date.now() + getState().demo.clockOffsetMs);
}

/** Set the clock so that "now" equals the given instant. */
export function setNow(target: Date): void {
  update((s) => {
    s.demo.clockOffsetMs = target.getTime() - Date.now();
  });
}
