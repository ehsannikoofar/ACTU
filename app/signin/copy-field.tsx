"use client";
import { useState } from "react";

export function CopyField({ value, label, copyLabel, copiedLabel }: { value: string; label: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="row" style={{ marginTop: 6 }}>
      <label className="sr-only" htmlFor="launch-url">{label}</label>
      <input id="launch-url" type="text" readOnly value={value} className="mono" style={{ flex: 1, minWidth: 240 }} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn ghost small" onClick={async () => { await navigator.clipboard?.writeText(value); setCopied(true); }}>
        {copied ? copiedLabel : copyLabel}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{copied ? copiedLabel : ""}</span>
    </div>
  );
}
