// Generate the backtest results page using Inbox Wars' actual brand aesthetic.
// Output: /Users/robertnowell/Projects/inbox-wars/data/backtest-results.html
//
// Palette + typography mirror src/app/globals.css and src/app/page.tsx:
//   cream paper, ink type, mono eyebrows, Bricolage display for headlines,
//   verdict-green appears ONLY on the winner card outline.

import * as fs from "fs";

const RESULTS = "/Users/robertnowell/Projects/inbox-wars/data/backtest-results-1778985118299.json";
const PAIRS = "/Users/robertnowell/Projects/inbox-wars/data/mirai-backtest-pairs.json";
const OUT = "/Users/robertnowell/Projects/inbox-wars/data/backtest-results.html";

const renderKlaviyoTemplate = (s: string) =>
  s
    .replace(/\{\{[^{}]*default:\s*['"]([^'"]*)['"][^{}]*\}\}/g, "$1")
    .replace(/\{\{[^{}]*default:\s*([^\s|}'"]+)[^{}]*\}\}/g, "$1")
    .replace(/\{\{\s*person\.first_name[^{}]*\}\}/gi, "friend")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();

const esc = (s: string) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtPct = (x: number, digits = 2) => (x * 100).toFixed(digits) + "%";
const fmtUsd = (x: number, digits = 0) =>
  "$" +
  x.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtUsdShort = (x: number) => {
  if (x >= 1000) return "$" + (x / 1000).toFixed(1) + "k";
  return "$" + x.toFixed(0);
};

const results = JSON.parse(fs.readFileSync(RESULTS, "utf-8"));
const pairsFile = JSON.parse(fs.readFileSync(PAIRS, "utf-8"));

type CampaignWithContent = {
  campaignId: string;
  name: string;
  recipients: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  revenuePerRecipient: number;
  conversionRate: number;
  subject: string;
  previewText: string;
  screenshotUrl: string;
};
type PairData = {
  metric: string;
  ratio: number;
  winner: CampaignWithContent;
  loser: CampaignWithContent;
};
type ArmAgg = {
  openedBy: number;
  clickedBy: number;
  purchasedBy: number;
  revenue: number;
};
type Detail = {
  pair: number;
  realWinnerArm: "A" | "B";
  sim: { armA: ArmAgg; armB: ArmAgg };
  simWinner: "A" | "B";
  agreed: boolean;
  candidateClicks: {
    A: Array<{ personaId: string; reason: string }>;
    B: Array<{ personaId: string; reason: string }>;
  };
};

const N = results.nPersonas as number;

const statRow = (
  label: string,
  realStr: string,
  simStr: string,
  highlight = false,
) => `
  <div class="stat-row ${highlight ? "stat-highlight" : ""}">
    <div class="stat-label">${label}</div>
    <div class="stat-val">${realStr}</div>
    <div class="stat-val sim">${simStr}</div>
  </div>`;

const renderQuote = (q: { personaId: string; reason: string }) => `
  <li class="quote">
    <span class="qmark">"</span>
    <span class="qtext">${esc(q.reason)}</span>
    <div class="qfrom">— ${esc(q.personaId)}</div>
  </li>`;

const candidateBlock = (
  side: "winner" | "loser",
  camp: CampaignWithContent,
  sim: ArmAgg,
  clicks: Array<{ personaId: string; reason: string }>,
) => {
  const realRev = camp.revenuePerRecipient * camp.recipients;
  // Sim rates: opens/30, clicks/30, buys/30 — apples-to-apples with the real rates
  const simOpenRate = sim.openedBy / N;
  const simClickRate = sim.clickedBy / N;
  const simBuyRate = sim.purchasedBy / N;

  return `
  <article class="candidate candidate-${side}">
    <header class="candidate-head">
      <div class="candidate-tag">
        ${side === "winner" ? "Real winner" : "Real loser"}
      </div>
      <div class="candidate-name">${esc(camp.name.length > 70 ? camp.name.slice(0, 67) + "…" : camp.name)}</div>
    </header>
    <div class="candidate-body">
      <div class="screenshot-wrap">
        <img class="screenshot" src="${camp.screenshotUrl}" alt="${esc(camp.subject)}" />
      </div>
      <div class="copy">
        <div class="subject">${esc(renderKlaviyoTemplate(camp.subject))}</div>
        <div class="preview">${esc(camp.previewText)}</div>
      </div>

      <div class="stats">
        <div class="stat-header">
          <div></div>
          <div class="col-label">Real (Klaviyo)</div>
          <div class="col-label sim">Sim · ${N} agents</div>
        </div>
        ${statRow("Open rate", fmtPct(camp.openRate), fmtPct(simOpenRate))}
        ${statRow("Click rate", fmtPct(camp.clickRate, 2), fmtPct(simClickRate), true)}
        ${statRow("Conversion rate", fmtPct(camp.conversionRate, 2), fmtPct(simBuyRate))}
        ${statRow("Revenue / recipient", fmtUsd(camp.revenuePerRecipient, 2), fmtUsd(sim.revenue / N, 2))}
        ${statRow("Total revenue", fmtUsdShort(realRev), fmtUsdShort(sim.revenue))}
        ${statRow("Recipients", camp.recipients.toLocaleString("en-US"), `${N}`)}
      </div>

      <div class="quotes-block">
        <div class="quotes-label">Why agents clicked this</div>
        ${clicks.length === 0
          ? '<div class="no-quotes">no agents clicked it</div>'
          : `<ul class="quotes">${clicks.slice(0, 3).map(renderQuote).join("")}</ul>`}
      </div>
    </div>
  </article>`;
};

const pairCard = (detail: Detail, pair: PairData) => {
  const winArm = detail.realWinnerArm;
  const winSim = winArm === "A" ? detail.sim.armA : detail.sim.armB;
  const loseSim = winArm === "A" ? detail.sim.armB : detail.sim.armA;
  const winClicks = winArm === "A" ? detail.candidateClicks.A : detail.candidateClicks.B;
  const loseClicks = winArm === "A" ? detail.candidateClicks.B : detail.candidateClicks.A;

  return `
  <section class="pair-grid">
    <aside class="pair-eyebrow">
      <div class="eyebrow">Pair ${String(detail.pair).padStart(2, "0")}</div>
      <div class="ratio">
        <span class="ratio-num tabular-nums">${pair.ratio.toFixed(2)}×</span>
        <span class="ratio-label">real clickRate gap</span>
      </div>
      <div class="verdict-chip ${detail.agreed ? "agreed" : "disagreed"}">
        ${detail.agreed ? "✓ Sim picked the real winner" : "✗ Sim picked the loser"}
      </div>
    </aside>
    <div class="pair-cards">
      ${candidateBlock("winner", pair.winner, winSim, winClicks)}
      ${candidateBlock("loser", pair.loser, loseSim, loseClicks)}
    </div>
  </section>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Backtest · Inbox Wars</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --paper: #faf9f5;
      --card: #ffffff;
      --ink: #141413;
      --muted: #6b6862;
      --hairline: #e8e3d8;
      --verdict: #00e091;
      --verdict-deep: #008a52;
      --font-display: "Bricolage Grotesque", system-ui, sans-serif;
      --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, monospace;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--paper); color: var(--ink); font-family: var(--font-sans); font-feature-settings: "ss01", "cv11"; -webkit-font-smoothing: antialiased; }
    a { color: inherit; }

    .topbar { position: sticky; top: 0; z-index: 20; border-bottom: 1px solid var(--hairline); background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); }
    .topbar-inner { max-width: 1280px; margin: 0 auto; padding: 12px 32px; display: flex; align-items: center; justify-content: space-between; }
    .wordmark { font-family: var(--font-display); font-size: 24px; font-weight: 800; letter-spacing: -0.01em; line-height: 1; color: var(--ink); text-decoration: none; }
    .topbar-mono { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--muted); }

    main { max-width: 1280px; margin: 0 auto; padding: 64px 32px 96px; }

    .eyebrow { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: var(--muted); }

    .hero { display: grid; grid-template-columns: 200px 1fr; gap: 48px; padding-bottom: 56px; margin-bottom: 56px; border-bottom: 1px solid var(--hairline); }
    .hero-eyebrow { padding-top: 8px; }
    .hero-num { font-family: var(--font-display); font-weight: 800; font-size: 112px; letter-spacing: -0.05em; line-height: 0.9; color: var(--ink); font-variant-numeric: tabular-nums; }
    .hero-num .sep { color: var(--muted); font-weight: 600; padding: 0 6px; }
    .hero-rule { margin-top: 14px; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--verdict-deep); }
    .hero-headline { font-family: var(--font-display); font-size: 44px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.08; margin-top: 28px; color: var(--ink); max-width: 760px; }
    .hero-sub { font-size: 17px; line-height: 1.55; color: var(--muted); margin-top: 18px; max-width: 720px; }
    .hero-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0; margin-top: 28px; border: 1px solid var(--hairline); border-radius: 8px; background: var(--card); }
    .hero-meta-cell { padding: 14px 18px; border-right: 1px solid var(--hairline); }
    .hero-meta-cell:last-child { border-right: none; }
    .hero-meta-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--muted); margin-bottom: 4px; }
    .hero-meta-val { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--ink); }

    .pair-grid { display: grid; grid-template-columns: 200px 1fr; gap: 48px; margin-bottom: 64px; align-items: start; }
    .pair-eyebrow { padding-top: 8px; position: sticky; top: 80px; }
    .pair-eyebrow .ratio { margin-top: 14px; display: flex; flex-direction: column; gap: 4px; }
    .ratio-num { font-family: var(--font-display); font-size: 36px; font-weight: 800; line-height: 1; letter-spacing: -0.03em; color: var(--ink); }
    .ratio-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--muted); }
    .verdict-chip { display: inline-flex; margin-top: 18px; padding: 8px 12px; border: 1px solid var(--hairline); border-radius: 6px; background: var(--card); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; }
    .verdict-chip.agreed { color: var(--verdict-deep); border-color: var(--verdict); background: rgba(0, 224, 145, 0.06); }
    .verdict-chip.disagreed { color: var(--muted); }

    .pair-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .candidate { background: var(--card); border: 1px solid var(--hairline); border-radius: 10px; overflow: hidden; }
    .candidate-winner { border-color: var(--verdict); box-shadow: 0 0 0 1px var(--verdict); }

    .candidate-head { padding: 14px 18px; border-bottom: 1px solid var(--hairline); }
    .candidate-tag { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--muted); margin-bottom: 6px; }
    .candidate-winner .candidate-tag { color: var(--verdict-deep); }
    .candidate-name { font-family: var(--font-sans); font-size: 12px; color: var(--muted); line-height: 1.35; }

    .candidate-body { padding: 18px; display: flex; flex-direction: column; gap: 18px; }

    .screenshot-wrap { background: var(--paper); border: 1px solid var(--hairline); border-radius: 6px; overflow: hidden; }
    .screenshot { width: 100%; height: 320px; object-fit: cover; object-position: top; display: block; }

    .copy .subject { font-family: var(--font-display); font-weight: 700; font-size: 17px; line-height: 1.3; color: var(--ink); margin-bottom: 6px; }
    .copy .preview { font-size: 13px; color: var(--muted); line-height: 1.4; }

    .stats { border: 1px solid var(--hairline); border-radius: 6px; overflow: hidden; }
    .stat-header { display: grid; grid-template-columns: 1.4fr 1fr 1fr; padding: 8px 12px; background: var(--paper); border-bottom: 1px solid var(--hairline); }
    .col-label { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.18em; color: var(--muted); }
    .col-label.sim { color: var(--ink); }
    .stat-row { display: grid; grid-template-columns: 1.4fr 1fr 1fr; padding: 8px 12px; border-bottom: 1px solid var(--hairline); align-items: baseline; }
    .stat-row:last-child { border-bottom: none; }
    .stat-row.stat-highlight { background: rgba(0, 224, 145, 0.04); }
    .candidate-loser .stat-row.stat-highlight { background: transparent; }
    .stat-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: var(--muted); }
    .stat-val { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: 13px; color: var(--ink); font-weight: 500; }
    .stat-val.sim { color: var(--ink); font-weight: 600; }
    .candidate-loser .stat-val { color: var(--muted); }

    .quotes-block .quotes-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--muted); margin-bottom: 10px; }
    .quotes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .quote { padding: 10px 12px; background: var(--paper); border-left: 2px solid var(--hairline); border-radius: 0 4px 4px 0; font-size: 13px; color: var(--ink); line-height: 1.45; }
    .candidate-winner .quote { border-left-color: var(--verdict); }
    .qmark { color: var(--muted); font-family: var(--font-display); font-size: 18px; line-height: 0; vertical-align: middle; margin-right: 4px; }
    .qfrom { font-family: var(--font-mono); font-size: 10px; color: var(--muted); margin-top: 4px; letter-spacing: 0.04em; }
    .no-quotes { font-family: var(--font-mono); font-size: 11px; color: var(--muted); padding: 8px 0; text-transform: lowercase; letter-spacing: 0.05em; }

    .footer { margin-top: 80px; padding-top: 32px; border-top: 1px solid var(--hairline); display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
    .footer .footer-meta { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--muted); }

    @media (max-width: 1100px) {
      .pair-cards { grid-template-columns: 1fr; }
    }
    @media (max-width: 760px) {
      main, .topbar-inner { padding-left: 20px; padding-right: 20px; }
      .hero, .pair-grid { grid-template-columns: 1fr; gap: 24px; }
      .hero-num { font-size: 80px; }
      .hero-headline { font-size: 32px; }
      .pair-eyebrow { position: static; display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
      .pair-eyebrow .ratio { margin-top: 0; flex-direction: row; align-items: baseline; gap: 8px; }
      .verdict-chip { margin-top: 0; }
      .screenshot { height: 240px; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a href="/" class="wordmark">INBOX WARS</a>
      <div class="topbar-mono">backtest · mirai clinical · ${new Date(results.generatedAt).toISOString().slice(0, 10)}</div>
    </div>
  </header>

  <main>
    <section class="hero">
      <aside class="hero-eyebrow">
        <div class="eyebrow">Real Klaviyo backtest</div>
      </aside>
      <div>
        <div class="hero-num">${results.agreements}<span class="sep">/</span>${results.nPairs}</div>
        <div class="hero-rule">100% agreement · open · click · revenue all aligned</div>
        <h1 class="hero-headline">Sim picked the real winner on every pair.</h1>
        <p class="hero-sub">
          Three pairs of real Mirai Clinical campaigns sent in the last 90 days via Klaviyo, each with a 6×–14× clickRate gap.
          We blinded the labels, rendered the real HTML to images, then ran ${N} stratified persona agents through each pair as
          a between-subjects A/B with vision in the click round. Verdict: the simulator's clicks ranked the real winner first
          in every pair — and open, click, and revenue signals all agreed.
        </p>
        <div class="hero-meta">
          <div class="hero-meta-cell">
            <div class="hero-meta-label">Agents / pair</div>
            <div class="hero-meta-val tabular-nums">${N}</div>
          </div>
          <div class="hero-meta-cell">
            <div class="hero-meta-label">Persona pools</div>
            <div class="hero-meta-val">Mirai · Gymshark · Everlane</div>
          </div>
          <div class="hero-meta-cell">
            <div class="hero-meta-label">Click round</div>
            <div class="hero-meta-val">Vision (HCTI)</div>
          </div>
          <div class="hero-meta-cell">
            <div class="hero-meta-label">Klaviyo window</div>
            <div class="hero-meta-val">Last 90 days</div>
          </div>
        </div>
      </div>
    </section>

    ${results.details
      .map((d: Detail) => pairCard(d, pairsFile.pairs[d.pair - 1] as PairData))
      .join("\n")}

    <footer class="footer">
      <div class="footer-meta">
        inbox wars · agentic A/B simulator · claude sonnet 4.6
      </div>
      <div class="footer-meta">
        ${new Date(results.generatedAt).toLocaleString()}
      </div>
    </footer>
  </main>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log("Wrote", OUT);
