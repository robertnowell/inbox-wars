// Sim Viz — animated playback of a real cached simulation run.
// Three phases over ~90s: opens → clicks → purchases.
// Data is REAL (emails, products, personas, rationales) but timing is fudged.
//
// v0 placeholder — phase animations land in next pass.

"use client";

import { useEffect, useState } from "react";
import type { SavedRun } from "@/lib/runs";
import { SimVizPhase1 } from "./sim-viz-phase-1";
import { SimVizPhase2 } from "./sim-viz-phase-2";
import { SimVizPhase3 } from "./sim-viz-phase-3";

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
}: {
  run: SavedRun;
  onComplete: () => void;
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
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted tabular-nums">
            {Math.round(progress * 100)}%
          </div>
        </div>
      </header>

      {/* Body */}
      {phase === "opens" && <SimVizPhase1 run={run} elapsed={elapsed} />}
      {phase === "clicks" && (
        <SimVizPhase2
          run={run}
          elapsed={elapsed - PHASE_DURATIONS.opens}
        />
      )}
      {phase === "purchases" && (
        <SimVizPhase3
          run={run}
          elapsed={elapsed - PHASE_DURATIONS.opens - PHASE_DURATIONS.clicks}
        />
      )}
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
