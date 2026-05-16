// Top-level page: load all cached per-brand runs, hand off to client-side
// state machine that flows setup → running → done.

import { loadRunForBrand } from "@/lib/runs";
import { DEMO_BRANDS } from "@/lib/fixtures/demo-brands";
import { DemoFlow } from "@/components/demo-flow";
import type { SavedRun } from "@/lib/runs";

export const dynamic = "force-dynamic";

export default function Home({
  searchParams,
}: {
  searchParams?: { phase?: string };
}) {
  // Load every cached per-brand run that exists on disk.
  const runsByBrand: Record<string, SavedRun> = {};
  for (const b of DEMO_BRANDS) {
    const r = loadRunForBrand(b.id);
    if (r) runsByBrand[b.id] = r;
  }

  // Dev convenience: ?phase=done skips straight to results (when at least
  // one cached run exists). Default is the full demo flow starting at setup.
  const initialPhase =
    searchParams?.phase === "done" && Object.keys(runsByBrand).length > 0
      ? "done"
      : searchParams?.phase === "running" && Object.keys(runsByBrand).length > 0
        ? "running"
        : "setup";

  return <DemoFlow runsByBrand={runsByBrand} initialPhase={initialPhase} />;
}
