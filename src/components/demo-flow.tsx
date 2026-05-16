// Top-level state machine for the demo: setup → running → done.
// All client-side — switches between three views.

"use client";

import { useState } from "react";
import type { SavedRun } from "@/lib/runs";
import { SetupView } from "./setup-view";
import { SimViz } from "./sim-viz";
import { Showdown } from "./showdown";
import { PersonaPanel } from "./persona-panel";

type Phase = "setup" | "running" | "done";

type Props = {
  runsByBrand: Record<string, SavedRun>;
  initialPhase?: Phase;
};

export function DemoFlow({ runsByBrand, initialPhase = "setup" }: Props) {
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const brandIds = Object.keys(runsByBrand);
  const [activeBrandId, setActiveBrandId] = useState<string>(
    brandIds[0] ?? "",
  );
  const activeRun: SavedRun | undefined = runsByBrand[activeBrandId];

  if (phase === "setup") {
    return (
      <SetupView
        defaultBrandId={activeBrandId}
        onRun={({ brandId }) => {
          // Switch the active run to the one matching the user's pick
          if (runsByBrand[brandId]) setActiveBrandId(brandId);
          setPhase("running");
        }}
      />
    );
  }

  if (phase === "running") {
    if (!activeRun) {
      return <NoRunFallback brandId={activeBrandId} onBack={() => setPhase("setup")} />;
    }
    return (
      <SimViz
        run={activeRun}
        onComplete={() => setPhase("done")}
        onSkip={() => setPhase("done")}
      />
    );
  }

  // phase === "done"
  if (!activeRun) {
    return <NoRunFallback brandId={activeBrandId} onBack={() => setPhase("setup")} />;
  }
  return <Results run={activeRun} onRestart={() => setPhase("setup")} />;
}

function Results({
  run,
  onRestart,
}: {
  run: SavedRun;
  onRestart: () => void;
}) {
  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-card border-b border-hairline sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <div className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none">
              INBOX WARS
            </div>
            <div className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              · {run.brandName}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">
              {run.personas.length} customers ·{" "}
              {new Date(run.generatedAt).toLocaleDateString()}
            </div>
            <button
              onClick={onRestart}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
            >
              ↺ new run
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section>
          <Showdown run={run} />
        </section>
        <section>
          <PersonaPanel run={run} />
        </section>
        <footer className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted py-8 border-t border-hairline">
          simulated · {run.personas.length} stratified llm persona agents ·
          paired a/b · claude sonnet 4.6
        </footer>
      </div>
    </main>
  );
}

function NoRunFallback({
  brandId,
  onBack,
}: {
  brandId: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-8">
      <div className="max-w-md text-center bg-card rounded-md border border-hairline p-8">
        <div className="font-display text-2xl font-bold tracking-tight text-ink">
          No cached run for this brand
        </div>
        <p className="text-muted mt-3 mb-4 text-sm">
          Run a fresh simulation first:
        </p>
        <pre className="text-left bg-paper border border-hairline rounded-sm px-4 py-3 text-xs font-mono text-ink">
          pnpm sim --brand={brandId}
        </pre>
        <button
          onClick={onBack}
          className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-ink"
        >
          ← back to setup
        </button>
      </div>
    </div>
  );
}
