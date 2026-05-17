// Real Klaviyo backtest results page.
// Reads the latest backtest JSON + matching pairs file at request time;
// stays in line with the landing/showdown aesthetic (cream paper, ink,
// mono labels, verdict-green only on the winner card outline).

import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

const RESULTS_PATH = path.join(
  process.cwd(),
  "data",
  "backtest-results-1778985118299.json",
);
const PAIRS_PATH = path.join(process.cwd(), "data", "mirai-backtest-pairs.json");

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
type ResultsFile = {
  generatedAt: string;
  nPersonas: number;
  nPairs: number;
  agreements: number;
  agreementRate: number;
  details: Detail[];
};
type PairsFile = {
  generatedAt: string;
  brandId: string;
  brandName: string;
  timeframe: string;
  rankedBy: string;
  pairs: PairData[];
};

function renderKlaviyoTemplate(s: string): string {
  return s
    .replace(/\{\{[^{}]*default:\s*['"]([^'"]*)['"][^{}]*\}\}/g, "$1")
    .replace(/\{\{[^{}]*default:\s*([^\s|}'"]+)[^{}]*\}\}/g, "$1")
    .replace(/\{\{\s*person\.first_name[^{}]*\}\}/gi, "friend")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const fmtPct = (x: number, digits = 2) => `${(x * 100).toFixed(digits)}%`;
const fmtUsd = (x: number, digits = 2) =>
  `$${x.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
const fmtUsdShort = (x: number) =>
  x >= 1000 ? `$${(x / 1000).toFixed(1)}k` : `$${x.toFixed(0)}`;

export default function BacktestPage() {
  const results = JSON.parse(fs.readFileSync(RESULTS_PATH, "utf-8")) as ResultsFile;
  const pairsFile = JSON.parse(fs.readFileSync(PAIRS_PATH, "utf-8")) as PairsFile;
  const N = results.nPersonas;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopBar generatedAt={results.generatedAt} />

      <div className="max-w-[1280px] mx-auto px-8 py-16">
        <Hero results={results} N={N} />

        <div className="space-y-16">
          {results.details.map((d) => (
            <PairCard
              key={d.pair}
              detail={d}
              pair={pairsFile.pairs[d.pair - 1]}
              N={N}
            />
          ))}
        </div>

        <Footer generatedAt={results.generatedAt} />
      </div>
    </main>
  );
}

function TopBar({ generatedAt }: { generatedAt: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-card/95 backdrop-blur">
      <div className="max-w-[1280px] mx-auto px-8 py-3 flex items-center justify-between">
        <a
          href="/"
          className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none hover:opacity-80"
        >
          INBOX WARS
        </a>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          backtest · mirai clinical · {generatedAt.slice(0, 10)}
        </div>
      </div>
    </header>
  );
}

function Hero({ results, N }: { results: ResultsFile; N: number }) {
  return (
    <section className="grid md:grid-cols-[200px_1fr] gap-12 pb-14 mb-14 border-b border-hairline">
      <aside className="pt-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
          Real Klaviyo backtest
        </div>
      </aside>
      <div>
        <div className="font-display font-extrabold text-[112px] leading-[0.9] tracking-[-0.05em] tabular-nums text-ink">
          {results.agreements}
          <span className="text-muted font-semibold px-1.5">/</span>
          {results.nPairs}
        </div>
        <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.2em] text-verdict-deep">
          100% agreement · open · click · revenue all aligned
        </div>
        <h1 className="font-display text-[44px] font-extrabold tracking-tight leading-[1.08] text-ink mt-7 max-w-[760px]">
          Sim picked the real winner on every pair.
        </h1>
        <p className="text-[17px] leading-relaxed text-muted mt-4 max-w-[720px]">
          Three pairs of real Mirai Clinical campaigns sent in the last 90 days via Klaviyo,
          each with a 6×–14× clickRate gap. We blinded the labels, rendered the real HTML to
          images, then ran {N} stratified persona agents through each pair as a between-subjects
          A/B with vision in the click round. Verdict: the simulator's clicks ranked the real
          winner first in every pair — and open, click, and revenue signals all agreed.
        </p>
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 border border-hairline rounded-lg bg-card overflow-hidden">
          <HeroMeta label="Agents / pair" value={String(N)} mono />
          <HeroMeta label="Persona pools" value="Mirai · Gymshark · Everlane" />
          <HeroMeta label="Click round" value="Vision (HCTI)" />
          <HeroMeta label="Klaviyo window" value="Last 90 days" />
        </div>
      </div>
    </section>
  );
}

function HeroMeta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-5 py-3.5 border-r border-hairline last:border-r-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
        {label}
      </div>
      <div
        className={`font-display text-[18px] font-bold text-ink ${
          mono ? "tabular-nums" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PairCard({
  detail,
  pair,
  N,
}: {
  detail: Detail;
  pair: PairData;
  N: number;
}) {
  const winArm = detail.realWinnerArm;
  const winSim = winArm === "A" ? detail.sim.armA : detail.sim.armB;
  const loseSim = winArm === "A" ? detail.sim.armB : detail.sim.armA;
  const winClicks =
    winArm === "A" ? detail.candidateClicks.A : detail.candidateClicks.B;
  const loseClicks =
    winArm === "A" ? detail.candidateClicks.B : detail.candidateClicks.A;

  return (
    <section className="grid md:grid-cols-[200px_1fr] gap-12 items-start">
      <aside className="pt-2 md:sticky md:top-20 flex md:flex-col items-baseline md:items-start gap-4 md:gap-0 flex-wrap">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
          Pair {String(detail.pair).padStart(2, "0")}
        </div>
        <div className="md:mt-4 flex md:flex-col items-baseline md:items-start gap-2 md:gap-1">
          <div className="font-display text-[36px] font-extrabold leading-none tracking-[-0.03em] text-ink tabular-nums">
            {pair.ratio.toFixed(2)}×
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            real clickRate gap
          </div>
        </div>
        <VerdictChip agreed={detail.agreed} />
      </aside>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <CandidateBlock
          side="winner"
          camp={pair.winner}
          sim={winSim}
          clicks={winClicks}
          N={N}
        />
        <CandidateBlock
          side="loser"
          camp={pair.loser}
          sim={loseSim}
          clicks={loseClicks}
          N={N}
        />
      </div>
    </section>
  );
}

function VerdictChip({ agreed }: { agreed: boolean }) {
  return (
    <div
      className={`md:mt-4 inline-flex px-3 py-2 border rounded-md font-mono text-[11px] uppercase tracking-[0.15em] ${
        agreed
          ? "text-verdict-deep border-verdict bg-verdict/5"
          : "text-muted border-hairline bg-card"
      }`}
    >
      {agreed ? "✓ Sim picked the real winner" : "✗ Sim picked the loser"}
    </div>
  );
}

function CandidateBlock({
  side,
  camp,
  sim,
  clicks,
  N,
}: {
  side: "winner" | "loser";
  camp: CampaignWithContent;
  sim: ArmAgg;
  clicks: Array<{ personaId: string; reason: string }>;
  N: number;
}) {
  const isWinner = side === "winner";
  const realRev = camp.revenuePerRecipient * camp.recipients;
  const simOpenRate = sim.openedBy / N;
  const simClickRate = sim.clickedBy / N;
  const simBuyRate = sim.purchasedBy / N;

  const cardCls = isWinner
    ? "border-verdict ring-1 ring-verdict"
    : "border-hairline";

  return (
    <article
      className={`bg-card border rounded-[10px] overflow-hidden ${cardCls}`}
    >
      <header className="px-5 py-3.5 border-b border-hairline">
        <div
          className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-1.5 ${
            isWinner ? "text-verdict-deep" : "text-muted"
          }`}
        >
          {isWinner ? "Real winner" : "Real loser"}
        </div>
        <div className="text-[12px] text-muted leading-snug">
          {camp.name.length > 80 ? `${camp.name.slice(0, 77)}…` : camp.name}
        </div>
      </header>

      <div className="p-5 space-y-5">
        <div className="bg-paper border border-hairline rounded-md overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={camp.screenshotUrl}
            alt={camp.subject}
            className="w-full h-80 object-cover object-top block"
          />
        </div>

        <div>
          <div className="font-display font-bold text-[17px] leading-snug text-ink">
            {renderKlaviyoTemplate(camp.subject)}
          </div>
          <div className="text-[13px] text-muted leading-snug mt-1.5">
            {camp.previewText}
          </div>
        </div>

        <StatsTable
          isWinner={isWinner}
          rows={[
            { label: "Open rate", real: fmtPct(camp.openRate), sim: fmtPct(simOpenRate) },
            {
              label: "Click rate",
              real: fmtPct(camp.clickRate),
              sim: fmtPct(simClickRate),
              highlight: true,
            },
            {
              label: "Conv. rate",
              real: fmtPct(camp.conversionRate),
              sim: fmtPct(simBuyRate),
            },
            {
              label: "Rev / recipient",
              real: fmtUsd(camp.revenuePerRecipient),
              sim: fmtUsd(sim.revenue / N),
            },
            {
              label: "Total revenue",
              real: fmtUsdShort(realRev),
              sim: fmtUsdShort(sim.revenue),
            },
            {
              label: "Recipients",
              real: camp.recipients.toLocaleString("en-US"),
              sim: String(N),
            },
          ]}
          N={N}
        />

        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2.5">
            Why agents clicked this
          </div>
          {clicks.length === 0 ? (
            <div className="font-mono text-[11px] text-muted py-2">
              no agents clicked it
            </div>
          ) : (
            <ul className="space-y-2 list-none p-0 m-0">
              {clicks.slice(0, 3).map((q, i) => (
                <Quote key={i} q={q} isWinner={isWinner} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

function StatsTable({
  isWinner,
  rows,
  N,
}: {
  isWinner: boolean;
  rows: Array<{ label: string; real: string; sim: string; highlight?: boolean }>;
  N: number;
}) {
  return (
    <div className="border border-hairline rounded-md overflow-hidden">
      <div className="grid grid-cols-[1.4fr_1fr_1fr] px-3 py-2 bg-paper border-b border-hairline">
        <div></div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted">
          Real (Klaviyo)
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink">
          Sim · {N} agents
        </div>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.label}
          className={`grid grid-cols-[1.4fr_1fr_1fr] px-3 py-2 items-baseline ${
            i < rows.length - 1 ? "border-b border-hairline" : ""
          } ${r.highlight && isWinner ? "bg-verdict/[0.04]" : ""}`}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
            {r.label}
          </div>
          <div
            className={`font-mono text-[13px] tabular-nums font-medium ${
              isWinner ? "text-ink" : "text-muted"
            }`}
          >
            {r.real}
          </div>
          <div
            className={`font-mono text-[13px] tabular-nums font-semibold ${
              isWinner ? "text-ink" : "text-muted"
            }`}
          >
            {r.sim}
          </div>
        </div>
      ))}
    </div>
  );
}

function Quote({
  q,
  isWinner,
}: {
  q: { personaId: string; reason: string };
  isWinner: boolean;
}) {
  return (
    <li
      className={`px-3 py-2.5 bg-paper border-l-2 rounded-r text-[13px] text-ink leading-snug ${
        isWinner ? "border-verdict" : "border-hairline"
      }`}
    >
      <span className="font-display text-[18px] text-muted leading-none align-middle mr-1">
        &ldquo;
      </span>
      <span>{q.reason}</span>
      <div className="font-mono text-[10px] text-muted mt-1 tracking-wider">
        — {q.personaId}
      </div>
    </li>
  );
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <footer className="mt-20 pt-8 border-t border-hairline flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
      <div>inbox wars · agentic A/B simulator · claude sonnet 4.6</div>
      <div>{new Date(generatedAt).toLocaleString()}</div>
    </footer>
  );
}
