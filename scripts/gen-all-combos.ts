// Precompute a SavedRun for every (A, B) email pair per demo brand.
//
// Storage: runs/brand-<brandId>__<sortedA>__<sortedB>.json
//   — pair is stored ONCE per unordered pair (alphabetical sort of chatIds).
//   — load-time logic swaps arms if user requests the reverse ordering.
//
// Idempotent: skips pairs whose JSON already exists. Use --force to regenerate all.
//
// Usage:  pnpm gen-combos
//         pnpm gen-combos --brand=mirai
//         pnpm gen-combos --concurrency=3
//         pnpm gen-combos --force

import fs from "node:fs";
import path from "node:path";
import { DEMO_BRANDS } from "../src/lib/fixtures/demo-brands";
import {
  getBrandAudience,
  getEmailFromChat,
  getProductsByIds,
  closeDb,
} from "../src/lib/kopi";
import { getMilledBackgroundEmails } from "../src/lib/milled-local";
import { loadOrGeneratePersonas } from "../src/lib/persona-gen";
import { runPairedSimulation } from "../src/lib/orchestrator";
import type { SavedRun } from "../src/lib/runs";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const N_PERSONAS = 10;

const args = process.argv.slice(2);
const brandFilter = args.find((a) => a.startsWith("--brand="))?.split("=")[1];
const concurrency = Number(args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] ?? 2);
const force = args.includes("--force");

function pairKey(idA: string, idB: string): string {
  return [idA, idB].sort().join("__");
}

async function pMapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array(Math.min(limit, items.length))
    .fill(0)
    .map(async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await fn(items[i], i);
      }
    });
  await Promise.all(workers);
  return results;
}

async function main() {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  const brands = brandFilter
    ? DEMO_BRANDS.filter((b) => b.slug === brandFilter || b.id === brandFilter)
    : DEMO_BRANDS;

  console.log(`\n► Caching pair combos for ${brands.length} brand(s) at concurrency ${concurrency}`);
  console.log(`  Force: ${force ? "yes" : "no — skip existing"}\n`);

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalCostUSD = 0;

  for (const brand of brands) {
    const emails = brand.emails;
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < emails.length; i++) {
      for (let j = i + 1; j < emails.length; j++) {
        pairs.push([emails[i].chatId, emails[j].chatId]);
      }
    }

    console.log(`═══ ${brand.name} (${brand.id})`);
    console.log(`    ${emails.length} emails · ${pairs.length} unordered pairs\n`);

    // Pre-fetch shared resources once per brand
    const audience = await getBrandAudience(brand.id);
    const { personas, axes } = await loadOrGeneratePersonas(audience, N_PERSONAS, {
      verbose: false,
    });
    const backgroundEmails = getMilledBackgroundEmails(1);
    const audienceExcerpt = audience.audience.slice(0, 500);

    let brandGenerated = 0;
    let brandSkipped = 0;

    await pMapLimit(pairs, concurrency, async ([idA, idB]) => {
      const key = pairKey(idA, idB);
      const filePath = path.join(RUNS_DIR, `brand-${brand.id}__${key}.json`);
      if (fs.existsSync(filePath) && !force) {
        brandSkipped++;
        totalSkipped++;
        console.log(`  ⊘ ${key}  (exists)`);
        return;
      }
      const t0 = Date.now();
      console.log(`  ▶ ${key}  starting...`);
      try {
        const [candidateA, candidateB] = await Promise.all([
          getEmailFromChat(idA),
          getEmailFromChat(idB),
        ]);
        const result = await runPairedSimulation({
          personas,
          candidateA,
          candidateB,
          backgroundEmails,
          concurrency: 8,
        });

        // Resolve every purchased product for the UI
        const productIds = [
          ...new Set(result.agentRuns.flatMap((r) => r.round3.purchases.map((p) => p.productId))),
        ];
        const products = await getProductsByIds(productIds);
        const productsById: Record<string, (typeof products)[number]> = {};
        for (const p of products) productsById[p.id] = p;

        const saved: SavedRun = {
          id: `run_${Date.now()}_${brand.id.slice(0, 8)}__${key}`,
          generatedAt: new Date().toISOString(),
          brandId: brand.id,
          brandName: brand.name,
          audienceExcerpt,
          axes,
          candidateA,
          candidateB,
          backgroundEmails,
          personas,
          agentRuns: result.agentRuns,
          aggregated: result.arms,
          productsById,
          totalCost: result.totalCost,
        };

        fs.writeFileSync(filePath, JSON.stringify(saved, null, 2));

        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        const cost =
          (result.totalCost.inputTokens / 1e6) * 3 +
          (result.totalCost.outputTokens / 1e6) * 15 +
          (result.totalCost.cacheReadTokens / 1e6) * 0.3;
        totalCostUSD += cost;
        brandGenerated++;
        totalGenerated++;
        console.log(
          `  ✓ ${key}  ${sec}s · A=$${result.arms.A.revenue.toFixed(2)} B=$${result.arms.B.revenue.toFixed(2)} · $${cost.toFixed(3)}`,
        );
      } catch (err) {
        console.error(`  ✗ ${key}  ERROR:`, err instanceof Error ? err.message : err);
      }
    });

    console.log(`    Brand done: ${brandGenerated} new · ${brandSkipped} skipped\n`);
  }

  console.log(`\n═══ ALL DONE`);
  console.log(`    Generated: ${totalGenerated}`);
  console.log(`    Skipped:   ${totalSkipped}`);
  console.log(`    Total cost (new runs): $${totalCostUSD.toFixed(2)}`);

  await closeDb();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
