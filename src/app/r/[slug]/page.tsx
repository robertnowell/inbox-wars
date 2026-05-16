// Permalink for a specific brand's cached run.
//   /r/mirai           → results view (the headline + persona panel)
//   /r/mirai?phase=running → plays the sim viz, then auto-advances to results

import { notFound } from "next/navigation";
import { loadRunForBrand } from "@/lib/runs";
import { getDemoBrandBySlug } from "@/lib/fixtures/demo-brands";
import { DemoRunPage } from "@/components/demo-flow";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const brand = getDemoBrandBySlug(slug);
  if (!brand) notFound();

  const run = loadRunForBrand(brand.id);
  if (!run) notFound();

  const phase = sp.phase === "running" ? "running" : "done";

  return <DemoRunPage run={run} initialPhase={phase} slug={slug} />;
}
