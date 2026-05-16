// Sim Viz — animated playback of a real cached simulation run.
// Three phases over ~90s: opens → clicks → purchases.
// Data is REAL (emails, products, personas, rationales) but timing is fudged.
//
// v0 placeholder — phase animations land in next pass.

"use client";

import { useEffect, useState } from "react";
import type { SavedRun } from "@/lib/runs";

const PHASE_DURATIONS = {
  opens: 30,    // 0–30s
  clicks: 30,   // 30–60s
  purchases: 30, // 60–90s
};
const TOTAL_DURATION = Object.values(PHASE_DURATIONS).reduce((a, b) => a + b, 0);

type Phase = "opens" | "clicks" | "purchases";

export function SimViz({
  run,
  onComplete,
  onSkip,
}: {
  run: SavedRun;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = setInterval(() => {
      const e = (Date.now() - start) / 1000;
      setElapsed(e);
      if (e >= TOTAL_DURATION) {
        clearInterval(tick);
        onComplete();
      }
    }, 100);
    return () => clearInterval(tick);
  }, [onComplete]);

  const phase: Phase =
    elapsed < PHASE_DURATIONS.opens
      ? "opens"
      : elapsed < PHASE_DURATIONS.opens + PHASE_DURATIONS.clicks
        ? "clicks"
        : "purchases";

  const progress = Math.min(elapsed / TOTAL_DURATION, 1);

  return (
    <div className="min-h-screen bg-paper">
      {/* Header with wordmark + progress + skip */}
      <header className="border-b border-hairline bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none">
            INBOX WARS
          </div>
          <div className="flex-1 max-w-2xl">
            <div className="flex items-center gap-3">
              <PhasePill label="OPENS" active={phase === "opens"} done={elapsed >= PHASE_DURATIONS.opens} />
              <div className="flex-1 h-px bg-hairline" />
              <PhasePill label="CLICKS" active={phase === "clicks"} done={elapsed >= PHASE_DURATIONS.opens + PHASE_DURATIONS.clicks} />
              <div className="flex-1 h-px bg-hairline" />
              <PhasePill label="PURCHASES" active={phase === "purchases"} done={elapsed >= TOTAL_DURATION} />
            </div>
            <div className="mt-2 h-1 bg-hairline rounded-sm overflow-hidden">
              <div
                className="h-full bg-ink transition-all duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <button
            onClick={onSkip}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
          >
            skip →
          </button>
        </div>
      </header>

      {/* Body — placeholder until the phase animations land */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            running simulation · {run.personas.length} agents · {run.brandName}
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
            Phase: {phase}
          </h1>
          <p className="text-muted">
            {phase === "opens" && "Agents glance at their inboxes…"}
            {phase === "clicks" && "Agents click through on the emails that grabbed them…"}
            {phase === "purchases" && "Agents make purchase decisions with their $100 budget…"}
          </p>
          <div className="font-mono text-xs text-muted/60">
            {elapsed.toFixed(1)}s / {TOTAL_DURATION}s
          </div>
        </div>
      </div>
    </div>
  );
}

function PhasePill({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={[
        "font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-sm",
        active
          ? "bg-ink text-paper"
          : done
            ? "text-ink"
            : "text-muted/60",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
