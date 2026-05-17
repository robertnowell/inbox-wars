// Permalink for a specific brand's cached run + (optional) A/B pair.
//   /r/mirai                    → defaults to brand's defaultA / defaultB
//   /r/mirai?a=<id>&b=<id>      → load the cached run for that exact pair
//   /r/mirai?phase=running      → play sim viz then advance
//   /r/mirai?a=...&b=...&phase=running → both

import { notFound } from "next/navigation";
import { loadRunForPair } from "@/lib/runs";
import { getDemoBrandBySlug } from "@/lib/fixtures/demo-brands";
import { DemoRunPage } from "@/components/demo-flow";
import { getProductsForCandidate, closeDb } from "@/lib/kopi";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ phase?: string; a?: string; b?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const brand = getDemoBrandBySlug(slug);
  if (!brand) notFound();

  const aId = sp.a ?? brand.defaultA;
  const bId = sp.b ?? brand.defaultB;

  const run = loadRunForPair(brand.id, aId, bId);
  if (!run) notFound();

  // Augment with products available per candidate (mediaPlan + embedding fallback).
  // Done server-side at request time so we always have ≥1 product per email
  // without regenerating the cached run JSON.
  try {
    const [candidateAProducts, candidateBProducts] = await Promise.all([
      getProductsForCandidate(run.candidateA, 2),
      getProductsForCandidate(run.candidateB, 2),
    ]);
    run.candidateAProducts = candidateAProducts;
    run.candidateBProducts = candidateBProducts;
  } catch {
    // If DB is unreachable, fall back to whatever was in productsById.
  }

  const phase = sp.phase === "running" ? "running" : "done";

  return <DemoRunPage run={run} initialPhase={phase} slug={slug} />;
}
