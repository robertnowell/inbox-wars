// Backtest: read 4 real Mirai Klaviyo pairs (winner vs loser by real perf),
// run runPairedSimulation on each, report whether the agents pick the real winner.
//
// Position-bias control: half the pairs have the real winner as arm A, half as arm B.
// We never tell the agents which is which.
//
// Usage:
//   pnpm tsx --env-file=.env.local scripts/backtest-mirai.ts
//   N_PERSONAS=20 pnpm tsx --env-file=.env.local scripts/backtest-mirai.ts

import * as fs from "fs";
import { runPairedSimulation } from "../src/lib/orchestrator";
import { getBrandAudience, closeDb } from "../src/lib/kopi";
import { loadOrGeneratePersonas } from "../src/lib/persona-gen";
import { getMilledBackgroundEmails } from "../src/lib/milled-local";
import { productsByBrand } from "../src/lib/fixtures";
import type { Email } from "../src/lib/types";

const MIRAI_BRAND_ID = "51IbVnKsvsalX66sLGjmy_WU3CexdP";
const PAIRS_PATH =
  "/Users/robertnowell/Projects/inbox-wars/data/mirai-backtest-pairs.json";

type CampaignWithContent = {
  campaignId: string;
  name: string;
  sendTime: string | null;
  recipients: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  revenuePerRecipient: number;
  conversionRate: number;
  subject: string;
  previewText: string;
  text: string;
  html: string;
  fromEmail: string;
  fromLabel: string;
  screenshotUrl?: string;
};

type PairFile = {
  generatedAt: string;
  brandId: string;
  brandName: string;
  timeframe: string;
  rankedBy: string;
  pairs: Array<{
    metric: string;
    gap: number;
    ratio: number;
    winner: CampaignWithContent;
    loser: CampaignWithContent;
  }>;
};

// Render Klaviyo Liquid template variables to their defaults so agents see plausible text
// instead of `{{ person.first_name|default:'friend' }}`.
function renderKlaviyoTemplate(s: string): string {
  return (
    s
      // {{ anything | ... | default:'X' | ... }}  (handles multi-pipe filter chains)
      .replace(/\{\{[^{}]*default:\s*['"]([^'"]*)['"][^{}]*\}\}/g, "$1")
      // {{ ... | default: X }}  (unquoted)
      .replace(/\{\{[^{}]*default:\s*([^\s|}'"]+)[^{}]*\}\}/g, "$1")
      // first_name lookup with no default
      .replace(/\{\{\s*person\.first_name[^{}]*\}\}/gi, "friend")
      // remaining liquid tags — strip
      .replace(/\{\{[^{}]*\}\}/g, "")
      .replace(/\{%[^{}]*%\}/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function htmlToText(html: string): string {
  return (
    html
      // Strip the entire <head>, <title>, hidden preview blocks
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      // Strip visibility-hidden / display-none blocks (Klaviyo preview-padding lives here)
      .replace(
        /<[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        "",
      )
      .replace(
        /<[^>]*style="[^"]*visibility\s*:\s*hidden[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi,
        "",
      )
      // Replace links and images with readable markers
      .replace(/<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 [link: $1]")
      .replace(/<img\b[^>]*\balt="([^"]*)"[^>]*\/?>/gi, "[Image: $1]")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(p|div|h[1-6]|li)\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      // Decode common named entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      // Decode numeric entities (&#1234; and &#x4D2;)
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      // Strip zero-width / invisible chars (preview-padding artifacts)
      .replace(
        new RegExp(
          '[\u200B-\u200F\u202A-\u202F\u2060-\u206F\uFEFF]',
          'g',
        ),
        '',
      )
      // Strip leading "Preview" labels Klaviyo sometimes leaves in
      .replace(/^\s*Preview\s+/i, "")
      // Strip pure-numeric leading lines (CSS line numbers leaking in)
      .replace(/^\s*\d+\s+/m, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n+/g, "\n\n")
      .trim()
  );
}

function toEmail(c: CampaignWithContent, idTag: string): Email {
  const bodyRaw =
    c.text && c.text.length > 200 ? c.text : htmlToText(c.html);
  const body = renderKlaviyoTemplate(bodyRaw.slice(0, 4000));
  const fromLabel = c.fromLabel || "Mirai Clinical";
  const fromEmail = c.fromEmail || "hello@miraiclinical.com";
  return {
    id: `mirai-real-${idTag}-${c.campaignId.slice(0, 10)}`,
    brandId: MIRAI_BRAND_ID,
    brandName: "Mirai Clinical",
    sender: `${fromLabel} <${fromEmail}>`,
    subject: renderKlaviyoTemplate(c.subject || c.name),
    preheader: renderKlaviyoTemplate(c.previewText || ""),
    bodyText: body,
    previewScreenshotUrl: c.screenshotUrl,
  };
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ ANTHROPIC_API_KEY not set. Check .env.local.");
    process.exit(1);
  }
  if (!fs.existsSync(PAIRS_PATH)) {
    console.error(
      `✗ Missing pairs file: ${PAIRS_PATH}\n  Run first: cd kopi/promotions && npx tsx scripts/export-mirai-pairs.ts`,
    );
    process.exit(1);
  }

  const file = JSON.parse(fs.readFileSync(PAIRS_PATH, "utf-8")) as PairFile;
  // PAIR_INDEX env var lets us dry-run a single pair before unleashing all 4
  const pairIndexEnv = process.env.PAIR_INDEX;
  if (pairIndexEnv !== undefined) {
    const i = Number(pairIndexEnv);
    if (Number.isNaN(i) || i < 0 || i >= file.pairs.length) {
      console.error(`✗ PAIR_INDEX=${pairIndexEnv} out of range (0..${file.pairs.length - 1})`);
      process.exit(1);
    }
    file.pairs = [file.pairs[i]];
    console.log(`[single-pair mode] PAIR_INDEX=${i}`);
  }
  console.log(
    `Loaded ${file.pairs.length} pairs (${file.brandName}, ${file.timeframe}, ranked by ${file.rankedBy})`,
  );
  console.log(`Vision mode: ${process.env.USE_VISION === "1" ? "ON (screenshots in click round)" : "off (text-only)"}\n`);

  // Personas: pool all cached personas across 3 brands by default (30 total),
  // or limit to Mirai-only with POOL_PERSONAS=0 / N_PERSONAS=N for the smaller run.
  const audience = await getBrandAudience(MIRAI_BRAND_ID);
  const poolPersonas = process.env.POOL_PERSONAS !== "0";
  let personas: import("../src/lib/types").Persona[];
  if (poolPersonas) {
    const personaDir =
      "/Users/robertnowell/Projects/inbox-wars/src/lib/fixtures/personas";
    const files = fs
      .readdirSync(personaDir)
      .filter((f) => f.endsWith(".json"));
    personas = [];
    for (const f of files) {
      const d = JSON.parse(
        fs.readFileSync(`${personaDir}/${f}`, "utf-8"),
      ) as {
        brandName: string;
        personas: import("../src/lib/types").Persona[];
      };
      console.log(`  + ${d.personas.length} personas from ${d.brandName}`);
      personas.push(...d.personas);
    }
    console.log(`✓ ${personas.length} pooled personas from ${files.length} brands`);
  } else {
    const N = Number(process.env.N_PERSONAS ?? 10);
    console.log(`Loading ${N} Mirai-only personas...`);
    const out = await loadOrGeneratePersonas(audience, N, {
      force: false,
      verbose: false,
    });
    personas = out.personas;
    console.log(`✓ ${personas.length} personas loaded`);
  }
  if (process.env.SKEPTICAL_PERSONAS === "1") {
    console.log(`  (SKEPTICAL_PERSONAS=1: anti-engagement priors injected into system prompt)`);
  }

  const backgroundEmails = getMilledBackgroundEmails(1);
  console.log(`✓ ${backgroundEmails.length} background emails loaded\n`);

  // Run sim per pair with position-bias control (alternate winner side)
  let agreements = 0;
  const detailed: Array<{
    pair: number;
    realWinnerName: string;
    realLoserName: string;
    realWinnerArm: "A" | "B";
    metric: string;
    realRatio: number;
    sim: {
      armA: { openedBy: number; clickedBy: number; purchasedBy: number; revenue: number };
      armB: { openedBy: number; clickedBy: number; purchasedBy: number; revenue: number };
    };
    simWinner: "A" | "B";
    agreed: boolean;
    // For diagnostics: which agents clicked the candidate in each arm + their reason
    candidateClicks: {
      A: Array<{ personaId: string; reason: string }>;
      B: Array<{ personaId: string; reason: string }>;
    };
  }> = [];

  for (let i = 0; i < file.pairs.length; i++) {
    const p = file.pairs[i];
    const winnerIsA = i % 2 === 0; // alternate to control for label bias
    const realWinnerArm: "A" | "B" = winnerIsA ? "A" : "B";
    const candidateA = toEmail(winnerIsA ? p.winner : p.loser, `pair${i + 1}A`);
    const candidateB = toEmail(winnerIsA ? p.loser : p.winner, `pair${i + 1}B`);

    console.log(`\n${"═".repeat(80)}`);
    console.log(`Pair ${i + 1}/${file.pairs.length}  (real winner = arm ${realWinnerArm})`);
    console.log(`${"═".repeat(80)}`);
    console.log(`A: "${candidateA.subject.slice(0, 70)}"`);
    console.log(`B: "${candidateB.subject.slice(0, 70)}"`);
    console.log(
      `Real: ${p.metric} winner=${(p.winner[p.metric as keyof typeof p.winner] as number).toFixed(p.metric === "revenuePerRecipient" ? 3 : 4)}  ` +
        `loser=${(p.loser[p.metric as keyof typeof p.loser] as number).toFixed(p.metric === "revenuePerRecipient" ? 3 : 4)}  ` +
        `ratio=${p.ratio.toFixed(2)}x`,
    );

    const t0 = Date.now();
    const result = await runPairedSimulation({
      personas,
      candidateA,
      candidateB,
      backgroundEmails,
      productsByBrand,
      concurrency: Math.min(personas.length * 2, 8),
      onProgress: (done, total, latest) => {
        process.stdout.write(
          `\r  [${String(done).padStart(2)}/${total}] arm=${latest.arm}  opens=${latest.round1.opens.length} clicks=${latest.round2.clicks.length} buys=${latest.round3.purchases.length}        `,
        );
      },
    });
    console.log(`\n  ✓ done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

    const a = result.arms.A;
    const b = result.arms.B;
    // METRIC env var picks the verdict signal. Default = "revenue" (which
    // falls through to click then open on ties — original behavior).
    // METRIC=click ranks purely by click count. METRIC=open ranks by open count.
    const metric = (process.env.METRIC ?? "revenue").toLowerCase();
    const pick = (av: number, bv: number, fallback: "A" | "B"): "A" | "B" =>
      av > bv ? "A" : bv > av ? "B" : fallback;
    const tieByClick = pick(a.clickedBy, b.clickedBy, pick(a.openedBy, b.openedBy, "A"));
    const simWinner: "A" | "B" =
      metric === "open"
        ? pick(a.openedBy, b.openedBy, "A")
        : metric === "click"
          ? pick(a.clickedBy, b.clickedBy, pick(a.openedBy, b.openedBy, "A"))
          : pick(a.revenue, b.revenue, tieByClick);
    const agreed = simWinner === realWinnerArm;
    if (agreed) agreements++;

    console.log(
      `  sim A: open=${a.openedBy}/${a.totalPersonas} click=${a.clickedBy} buy=${a.purchasedBy} rev=$${a.revenue.toFixed(2)}`,
    );
    console.log(
      `  sim B: open=${b.openedBy}/${b.totalPersonas} click=${b.clickedBy} buy=${b.purchasedBy} rev=$${b.revenue.toFixed(2)}`,
    );
    console.log(
      `  sim winner: ${simWinner}   real winner: ${realWinnerArm}   ${agreed ? "✓ AGREED" : "✗ DISAGREED"}`,
    );

    detailed.push({
      pair: i + 1,
      realWinnerName: p.winner.name,
      realLoserName: p.loser.name,
      realWinnerArm,
      metric: p.metric,
      realRatio: p.ratio,
      sim: {
        armA: {
          openedBy: a.openedBy,
          clickedBy: a.clickedBy,
          purchasedBy: a.purchasedBy,
          revenue: a.revenue,
        },
        armB: {
          openedBy: b.openedBy,
          clickedBy: b.clickedBy,
          purchasedBy: b.purchasedBy,
          revenue: b.revenue,
        },
      },
      simWinner,
      agreed,
      candidateClicks: {
        A: result.agentRuns
          .filter((r) => r.arm === "A")
          .flatMap((r) =>
            r.round2.clicks
              .filter((c) => c.emailId === candidateA.id)
              .map((c) => ({ personaId: r.personaId, reason: c.reason })),
          ),
        B: result.agentRuns
          .filter((r) => r.arm === "B")
          .flatMap((r) =>
            r.round2.clicks
              .filter((c) => c.emailId === candidateB.id)
              .map((c) => ({ personaId: r.personaId, reason: c.reason })),
          ),
      },
    });
  }

  console.log(`\n${"═".repeat(80)}`);
  console.log(
    `SUMMARY: ${agreements}/${file.pairs.length} pairs — agents picked the real winner`,
  );
  console.log(
    `Agreement rate: ${((agreements / file.pairs.length) * 100).toFixed(0)}%`,
  );
  console.log(`${"═".repeat(80)}\n`);

  // Persist results
  const outPath = `/Users/robertnowell/Projects/inbox-wars/data/backtest-results-${Date.now()}.json`;
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        nPersonas: personas.length,
        nPairs: file.pairs.length,
        agreements,
        agreementRate: agreements / file.pairs.length,
        details: detailed,
      },
      null,
      2,
    ),
  );
  console.log(`Results: ${outPath}`);

  await closeDb();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
