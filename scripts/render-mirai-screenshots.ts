// Render screenshots for each campaign in mirai-backtest-pairs.json via HCTI.io.
// Mutates the pairs JSON in place, adding `screenshotUrl` to each campaign.
//
// Requires env: HTMLCSSTOIMAGE_API_ID, HTMLCSSTOIMAGE_API_KEY
//   (sourced from kopi/promotions/.env.local; pass via --env-file or export inline)
//
// Usage:
//   pnpm tsx --env-file=/Users/robertnowell/Projects/kopi/promotions/.env.local scripts/render-mirai-screenshots.ts

import * as fs from "fs";

// Inline-load HCTI creds from kopi env files (avoids tsx --env-file path issues)
for (const envPath of [
  "/Users/robertnowell/Projects/kopi/promotions/.env",
  "/Users/robertnowell/Projects/kopi/promotions/.env.local",
]) {
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^\s*(HTMLCSSTOIMAGE_API_(?:ID|KEY))\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const PAIRS_PATH =
  "/Users/robertnowell/Projects/inbox-wars/data/mirai-backtest-pairs.json";
const HCTI_ENDPOINT = "https://hcti.io/v1/image";
const SCREENSHOT_WIDTH = 600; // typical email body width
// height auto when omitted; HCTI captures full page

async function renderOne(html: string): Promise<string> {
  const apiId = process.env.HTMLCSSTOIMAGE_API_ID;
  const apiKey = process.env.HTMLCSSTOIMAGE_API_KEY;
  if (!apiId || !apiKey) {
    throw new Error(
      "HTMLCSSTOIMAGE_API_ID / _KEY not set. Source kopi/promotions/.env.local.",
    );
  }
  const auth = Buffer.from(`${apiId}:${apiKey}`).toString("base64");
  const res = await fetch(HCTI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      html,
      viewport_width: SCREENSHOT_WIDTH,
      viewport_height: 1800,
      ms_delay: 500,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HCTI ${res.status}: ${t.slice(0, 200)}`);
  }
  const data: { url?: string } = await res.json();
  if (!data.url) throw new Error(`HCTI no url in response: ${JSON.stringify(data).slice(0, 200)}`);
  return data.url;
}

async function main() {
  const file = JSON.parse(fs.readFileSync(PAIRS_PATH, "utf-8")) as {
    pairs: Array<{
      winner: { campaignId: string; name: string; html: string; screenshotUrl?: string };
      loser: { campaignId: string; name: string; html: string; screenshotUrl?: string };
    }>;
  };

  const targets: Array<{ tag: string; obj: { html: string; screenshotUrl?: string } }> = [];
  for (const [i, p] of file.pairs.entries()) {
    if (!p.winner.screenshotUrl) targets.push({ tag: `pair${i + 1}.winner`, obj: p.winner });
    if (!p.loser.screenshotUrl) targets.push({ tag: `pair${i + 1}.loser`, obj: p.loser });
  }
  console.log(`Rendering ${targets.length} screenshots via HCTI.io...`);

  for (const t of targets) {
    try {
      const t0 = Date.now();
      const url = await renderOne(t.obj.html);
      t.obj.screenshotUrl = url;
      console.log(`  ✓ ${t.tag.padEnd(20)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${url}`);
    } catch (e) {
      console.error(`  ✗ ${t.tag}: ${(e as Error).message}`);
    }
  }

  fs.writeFileSync(PAIRS_PATH, JSON.stringify(file, null, 2));
  console.log(`\n✓ Wrote ${PAIRS_PATH}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
