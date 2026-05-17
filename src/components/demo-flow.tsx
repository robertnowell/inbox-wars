// Top-level state machine for the demo: setup → running → done.
// URL-driven:
//   /                   → setup
//   /r/[slug]?phase=running → sim viz playback (auto-advances)
//   /r/[slug]           → results (the headline + persona panel)

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SavedRun } from "@/lib/runs";
import { SetupView } from "./setup-view";
import { SimViz } from "./sim-viz";
import { Showdown } from "./showdown";
import { PersonaPanel } from "./persona-panel";
import { getDemoBrand } from "@/lib/fixtures/demo-brands";

type Phase = "setup" | "running" | "done";

/* ───────── Entry point (used at /) ───────── */

export function DemoSetupEntry() {
  const router = useRouter();
  return (
    <SetupView
      onRun={({ brandId, emailAId, emailBId }) => {
        const brand = getDemoBrand(brandId);
        if (!brand) return;
        const a = emailAId ?? brand.defaultA;
        const b = emailBId ?? brand.defaultB;
        router.push(`/r/${brand.slug}?a=${a}&b=${b}&phase=running`);
      }}
    />
  );
}

/* ───────── Per-run page (used at /r/[slug]) ───────── */

export function DemoRunPage({
  run,
  initialPhase,
  slug,
}: {
  run: SavedRun;
  initialPhase: Phase;
  slug: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(initialPhase);

  if (phase === "running") {
    return (
      <SimViz
        run={run}
        onComplete={() => {
          setPhase("done");
          // Strip ?phase=running but PRESERVE ?a= and ?b= so the results page
          // loads the same cached run the user chose (not the brand default).
          const params = new URLSearchParams(window.location.search);
          params.delete("phase");
          const query = params.toString();
          router.replace(`/r/${slug}${query ? `?${query}` : ""}`);
        }}
      />
    );
  }

  // phase === "done"
  return <Results run={run} slug={slug} />;
}

/* ───────── Results view ───────── */

function Results({ run, slug }: { run: SavedRun; slug: string }) {
  return (
    <main className="min-h-screen bg-paper">
      <header className="bg-card border-b border-hairline sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <a
              href="/"
              className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none hover:opacity-80"
            >
              INBOX WARS
            </a>
            <div className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              · {run.brandName}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">
              {run.personas.length} customers ·{" "}
              {new Date(run.generatedAt).toLocaleDateString()}
            </div>
            <a
              href="/simulation"
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted hover:text-ink transition-colors"
            >
              ↺ new run
            </a>
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
        <footer className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted py-8 border-t border-hairline space-y-1">
          <div>
            simulated · {run.personas.length} stratified llm persona agents ·
            paired a/b · claude sonnet 4.6
          </div>
          <div className="text-muted/60">
            run /r/{slug} · permalink
          </div>
        </footer>
      </div>
    </main>
  );
}
