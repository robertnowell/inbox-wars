// CLI entry: run a paired simulation and print results.
// Usage: pnpm sim                          # uses default brand (Moon Juice)
//        pnpm sim --brand=<brandId>        # use a specific kopi brand
//        pnpm sim --list-brands            # list eligible brands and exit
//
// Real-data flow: pull brandSummary from kopi DB → generate persona via LLM → run sim.
// Inbox emails + candidate A/B + products still inline for v0.5; next pass swaps to kopi.

import { productsByBrand } from "../src/lib/fixtures";
import { runPairedSimulation } from "../src/lib/orchestrator";
import {
  listBrandsWithData,
  getBrandAudience,
  getEmailFromChat,
  getProductsByIds,
  closeDb,
} from "../src/lib/kopi";
import { getMilledBackgroundEmails } from "../src/lib/milled-local";
import { loadOrGeneratePersonas } from "../src/lib/persona-gen";
import { saveRun } from "../src/lib/runs";

const HRULE = "─".repeat(80);
const DEFAULT_BRAND_ID = "51IbVnKsvsalX66sLGjmy_WU3CexdP"; // Mirai Clinical — has 935 authored emails + audience psychographic
// Two real Mirai-authored emails — BOTH have author-attached products (mediaPlan.products > 0),
// so the purchase round is honest (the agent considers products the email is actually selling,
// not products surfaced by an embedding-search fallback for a content-only / waitlist email).
const DEFAULT_EMAIL_A = "GDjhImfGuo"; // "There's a name for that 'older' smell" — editorial Nonenal-science angle, 3 products
const DEFAULT_EMAIL_B = "tAmsl9ZJsY"; // "Your allergies might be telling you something" — allergy/scent angle, 3 products

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ ANTHROPIC_API_KEY not set. Check .env.local.");
    process.exit(1);
  }

  // CLI args
  const args = process.argv.slice(2);
  const brandArg = args.find((a) => a.startsWith("--brand="))?.split("=")[1];
  const listFlag = args.includes("--list-brands");

  if (listFlag) {
    const brands = await listBrandsWithData();
    console.log("Brands with both audience psychographic AND authored emails:\n");
    console.log("  ID".padEnd(34), "Brand".padEnd(34), "Emails");
    for (const b of brands) {
      console.log(`  ${b.id.padEnd(32)}  ${b.name.padEnd(32)}  ${b.emailCount}`);
    }
    await closeDb();
    return;
  }

  const brandId = brandArg ?? DEFAULT_BRAND_ID;

  console.log(HRULE);
  console.log("Inbox Wars — paired simulation (real psychographics from kopi enrichment)");
  console.log(HRULE);
  console.log(`Brand:          fetching audience chunk from kopi DB (id: ${brandId})...`);

  const audience = await getBrandAudience(brandId);
  console.log(`Brand:          ${audience.brandName}`);
  console.log(`Audience chunk: ${audience.audience.length} chars`);
  if (audience.painPoints) console.log(`Pain points:    ${audience.painPoints.length} chars`);
  if (audience.dreamsOutcomes) console.log(`Dreams/outcomes:${audience.dreamsOutcomes.length} chars`);
  console.log();
  console.log("Audience excerpt:");
  console.log(`  ${audience.audience.slice(0, 280)}...`);
  console.log();

  const nArg = args.find((a) => a.startsWith("--n="))?.split("=")[1];
  const forceRegen = args.includes("--regen-personas");
  const N = nArg ? Number(nArg) : 10;
  const { personas, axes, cached } = await loadOrGeneratePersonas(audience, N, {
    force: forceRegen,
    verbose: true,
  });
  console.log(
    `Personas:       ${personas.length} stratified ${cached ? "(loaded from cache)" : "(freshly generated)"}`,
  );
  console.log(`Strat. axes:    ${axes.map((a) => a.name).join(", ")}`);
  console.log();

  // Pull the two real candidate emails from kopi
  const emailAArg = args.find((a) => a.startsWith("--email-a="))?.split("=")[1];
  const emailBArg = args.find((a) => a.startsWith("--email-b="))?.split("=")[1];
  const emailAId = emailAArg ?? DEFAULT_EMAIL_A;
  const emailBId = emailBArg ?? DEFAULT_EMAIL_B;
  console.log(`Fetching candidate emails from kopi DB...`);
  const [candidateA, candidateB] = await Promise.all([
    getEmailFromChat(emailAId),
    getEmailFromChat(emailBId),
  ]);
  console.log(`Candidate A:    "${candidateA.subject}"  (${candidateA.bodyText.length} chars body)`);
  console.log(`Candidate B:    "${candidateB.subject}"  (${candidateB.bodyText.length} chars body)`);

  console.log(`Loading Milled background emails from local scrape (1 per brand)...`);
  const backgroundEmails = getMilledBackgroundEmails(1);
  const brandsRepresented = new Set(backgroundEmails.map((e) => e.brandName));
  console.log(`Background:     ${backgroundEmails.length} real Milled-scraped emails from ${brandsRepresented.size} brands`);
  console.log(`                (${[...brandsRepresented].join(", ")})`);
  console.log(`Inbox size:     ${backgroundEmails.length + 1} per arm`);
  console.log(HRULE);
  console.log();

  const start = Date.now();

  const result = await runPairedSimulation({
    personas,
    candidateA,
    candidateB,
    backgroundEmails,
    productsByBrand,
    concurrency: Math.min(personas.length * 2, 8),
    onProgress: (done, total, latest) => {
      console.log(
        `  [${String(done).padStart(2)}/${total}] arm=${latest.arm}  ` +
          `${latest.personaId.slice(0, 30).padEnd(30)}  ` +
          `opens=${latest.round1.opens.length} clicks=${latest.round2.clicks.length} ` +
          `purchases=${latest.round3.purchases.length} ($${latest.round3.totalSpent.toFixed(2)})`,
      );
    },
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log();
  console.log(HRULE);
  console.log(`✓ Complete in ${elapsed}s`);
  console.log(HRULE);
  console.log();

  // --- Aggregate ---
  console.log("RESULTS (per arm aggregate)");
  console.log(HRULE);
  const fmt = (a: typeof result.arms.A) =>
    `  ${a.arm}  opened=${a.openedBy}/${a.totalPersonas}  clicked=${a.clickedBy}/${a.totalPersonas}  ` +
    `purchased=${a.purchasedBy}/${a.totalPersonas}  revenue=$${a.revenue.toFixed(2)}`;
  console.log(fmt(result.arms.A));
  console.log(fmt(result.arms.B));
  console.log();

  // --- Verdict ---
  const winner =
    result.arms.A.revenue > result.arms.B.revenue
      ? "A"
      : result.arms.B.revenue > result.arms.A.revenue
        ? "B"
        : result.arms.A.clickedBy > result.arms.B.clickedBy
          ? "A"
          : result.arms.B.clickedBy > result.arms.A.clickedBy
            ? "B"
            : result.arms.A.openedBy >= result.arms.B.openedBy
              ? "A"
              : "B";
  console.log(`▶ Verdict (single persona — not statistically meaningful):  Email ${winner} wins`);
  console.log();

  // --- Per-persona paired summary (compact, scales to N=10+) ---
  console.log(HRULE);
  console.log("PER-PERSONA PAIRED COMPARISON");
  console.log(HRULE);
  console.log(
    "  persona".padEnd(36) +
      "│ A: open click buy spend  │ B: open click buy spend  │ winner",
  );
  console.log("  " + "─".repeat(98));
  for (const persona of personas) {
    const a = result.agentRuns.find((r) => r.personaId === persona.id && r.arm === "A");
    const b = result.agentRuns.find((r) => r.personaId === persona.id && r.arm === "B");
    if (!a || !b) continue;
    const aOpen = a.round1.opens.some((o) => o.emailId === candidateA.id) ? "✓" : "·";
    const aClick = a.round2.clicks.some((c) => c.emailId === candidateA.id) ? "✓" : "·";
    const aBuy = a.round3.purchases.length > 0 ? "✓" : "·";
    const aSpend = a.round3.totalSpent;
    const bOpen = b.round1.opens.some((o) => o.emailId === candidateB.id) ? "✓" : "·";
    const bClick = b.round2.clicks.some((c) => c.emailId === candidateB.id) ? "✓" : "·";
    const bBuy = b.round3.purchases.length > 0 ? "✓" : "·";
    const bSpend = b.round3.totalSpent;
    const winner = aSpend > bSpend ? "A" : bSpend > aSpend ? "B" : aBuy !== bBuy ? (aBuy === "✓" ? "A" : "B") : "—";
    console.log(
      `  ${persona.name.slice(0, 30).padEnd(34)}` +
        `│   ${aOpen}     ${aClick}    ${aBuy}  $${aSpend.toFixed(2).padStart(6)}  ` +
        `│   ${bOpen}     ${bClick}    ${bBuy}  $${bSpend.toFixed(2).padStart(6)}  │   ${winner}`,
    );
  }

  console.log();
  console.log(HRULE);
  console.log("COST");
  console.log(HRULE);
  const c = result.totalCost;
  console.log(`  Input tokens:        ${c.inputTokens.toLocaleString()}`);
  console.log(`  Output tokens:       ${c.outputTokens.toLocaleString()}`);
  console.log(`  Cache read tokens:   ${c.cacheReadTokens.toLocaleString()}`);
  // Sonnet 4.6: $3/MTok input, $15/MTok output, $0.30/MTok cache read
  const cost =
    (c.inputTokens / 1e6) * 3 +
    (c.outputTokens / 1e6) * 15 +
    (c.cacheReadTokens / 1e6) * 0.3;
  console.log(`  Est. cost:           $${cost.toFixed(4)}`);
  console.log();

  // --- Persist the run for the UI ---
  const allPurchasedIds = [
    ...new Set(result.agentRuns.flatMap((r) => r.round3.purchases.map((p) => p.productId))),
  ];
  const products = await getProductsByIds(allPurchasedIds);
  const productsById: Record<string, typeof products[number]> = {};
  for (const p of products) productsById[p.id] = p;

  const runId = `run_${Date.now()}_${audience.brandId.slice(0, 8)}`;
  const savedPath = saveRun({
    id: runId,
    generatedAt: new Date().toISOString(),
    brandId: audience.brandId,
    brandName: audience.brandName,
    audienceExcerpt: audience.audience.slice(0, 500),
    axes,
    candidateA,
    candidateB,
    backgroundEmails,
    personas,
    agentRuns: result.agentRuns,
    aggregated: result.arms,
    productsById,
    totalCost: result.totalCost,
  });
  console.log(`✓ Run saved: ${savedPath}`);
  console.log(`  Open the UI:  pnpm dev  →  http://localhost:3000`);
  console.log();

  await closeDb();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
