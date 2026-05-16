// The headline showdown — paired candidates with identical neutral cards,
// followed by a verdict reveal (the only place green appears).

import type { SavedRun } from "@/lib/runs";
import type { AgentRunResult, Email } from "@/lib/types";

export function Showdown({ run }: { run: SavedRun }) {
  const a = run.aggregated.A;
  const b = run.aggregated.B;
  const total = run.personas.length;

  let revenueWinner: "A" | "B" | "tie" = "tie";
  if (a.revenue > b.revenue) revenueWinner = "A";
  else if (b.revenue > a.revenue) revenueWinner = "B";

  let convWinner: "A" | "B" | "tie" = "tie";
  if (a.purchasedBy > b.purchasedBy) convWinner = "A";
  else if (b.purchasedBy > a.purchasedBy) convWinner = "B";

  const quotesA = pickStandoutQuotes(run.agentRuns, "A", run.candidateA.id, 3);
  const quotesB = pickStandoutQuotes(run.agentRuns, "B", run.candidateB.id, 3);

  // Per-dimension winners — used to bold the winning value and un-bold the loser
  const dimWinner = (av: number, bv: number): "A" | "B" | "tie" =>
    av > bv ? "A" : bv > av ? "B" : "tie";
  const winners = {
    opened: dimWinner(a.openedBy, b.openedBy),
    clicked: dimWinner(a.clickedBy, b.clickedBy),
    purchased: dimWinner(a.purchasedBy, b.purchasedBy),
    revenue: dimWinner(a.revenue, b.revenue),
  };

  return (
    <div className="space-y-8">
      {/* 1. Verdict headline at top — 3-col with mini cards bracketing the verdict */}
      <VerdictHeadline
        candidateA={run.candidateA}
        candidateB={run.candidateB}
        a={a}
        b={b}
        revenueWinner={revenueWinner}
        convWinner={convWinner}
        topQuote={
          revenueWinner === "A"
            ? quotesA[0]
            : revenueWinner === "B"
              ? quotesB[0]
              : undefined
        }
        topQuotePersona={
          revenueWinner !== "tie"
            ? findTopQuotePersona(run, revenueWinner)
            : undefined
        }
      />

      {/* 2. Detailed paired candidate cards — identical visual weight, full evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CandidateCard
          arm="A"
          email={run.candidateA}
          opened={a.openedBy}
          clicked={a.clickedBy}
          purchased={a.purchasedBy}
          revenue={a.revenue}
          total={total}
          quotes={quotesA}
          winsThisCard={{
            opened: winners.opened === "A",
            clicked: winners.clicked === "A",
            purchased: winners.purchased === "A",
            revenue: winners.revenue === "A",
          }}
          losesThisCard={{
            opened: winners.opened === "B",
            clicked: winners.clicked === "B",
            purchased: winners.purchased === "B",
            revenue: winners.revenue === "B",
          }}
        />
        <CandidateCard
          arm="B"
          email={run.candidateB}
          opened={b.openedBy}
          clicked={b.clickedBy}
          purchased={b.purchasedBy}
          revenue={b.revenue}
          total={total}
          quotes={quotesB}
          winsThisCard={{
            opened: winners.opened === "B",
            clicked: winners.clicked === "B",
            purchased: winners.purchased === "B",
            revenue: winners.revenue === "B",
          }}
          losesThisCard={{
            opened: winners.opened === "A",
            clicked: winners.clicked === "A",
            purchased: winners.purchased === "A",
            revenue: winners.revenue === "A",
          }}
        />
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// VerdictHeadline — 3-column: mini A · verdict text · mini B
// Winner mini gets the green outline (the only chromatic moment on the page)
// -----------------------------------------------------------------------------

function VerdictHeadline({
  candidateA,
  candidateB,
  a,
  b,
  revenueWinner,
  convWinner,
  topQuote,
  topQuotePersona,
}: {
  candidateA: Email;
  candidateB: Email;
  a: SavedRun["aggregated"]["A"];
  b: SavedRun["aggregated"]["B"];
  revenueWinner: "A" | "B" | "tie";
  convWinner: "A" | "B" | "tie";
  topQuote?: string;
  topQuotePersona?: string;
}) {
  const revDelta = Math.abs(a.revenue - b.revenue);
  const loser = revenueWinner === "A" ? "B" : "A";
  const winnerRev = revenueWinner === "A" ? a.revenue : b.revenue;
  const loserRev = revenueWinner === "A" ? b.revenue : a.revenue;
  const multiple = loserRev > 0 ? winnerRev / loserRev : null;

  const aIsWinner = revenueWinner === "A";
  const bIsWinner = revenueWinner === "B";

  return (
    <div className="bg-card border border-hairline rounded-md overflow-hidden relative">
      {/* Green accent bar — only above the WINNER's column, so the eye is directed */}
      {revenueWinner !== "tie" && (
        <div
          className={`absolute top-0 h-1 ${
            revenueWinner === "A" ? "left-0 w-1/4" : "right-0 w-1/4"
          }`}
          style={{ background: "var(--verdict)" }}
        />
      )}

      <div className="grid grid-cols-12 items-stretch">
        {/* Left column — Candidate A mini */}
        <div className="col-span-3 p-5 border-r border-hairline flex flex-col">
          <MiniCandidateInline
            arm="A"
            email={candidateA}
            isWinner={aIsWinner}
          />
        </div>

        {/* Center column — verdict */}
        <div className="col-span-6 px-8 py-10 flex flex-col items-center justify-center text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-verdict-deep mb-3">
            ● verdict
          </div>

          <h2 className="font-display text-3xl md:text-4xl font-semibold text-ink leading-tight mb-1">
            {revenueWinner !== "tie" ? (
              <>Candidate {revenueWinner} wins</>
            ) : convWinner !== "tie" ? (
              <>Candidate {convWinner} wins on conversion</>
            ) : (
              <>Tie</>
            )}
          </h2>

          {revenueWinner !== "tie" && multiple && multiple > 1 && (
            <div className="font-display text-xl text-muted font-normal mb-2">
              {multiple.toFixed(1)}× revenue over {loser}
            </div>
          )}

          {topQuote && (
            <div className="mt-5 max-w-xl">
              <div
                className="text-base italic text-ink leading-relaxed"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                &ldquo;{topQuote}&rdquo;
              </div>
              {topQuotePersona && (
                <div className="font-mono text-xs text-muted mt-3">
                  — {topQuotePersona}
                </div>
              )}
            </div>
          )}

          {revenueWinner !== "tie" &&
            convWinner !== "tie" &&
            revenueWinner !== convWinner && (
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mt-5 max-w-md">
                optimize AOV → send {revenueWinner} · optimize breadth → send{" "}
                {convWinner} (+{Math.abs(a.purchasedBy - b.purchasedBy)}{" "}
                buyers)
              </div>
            )}

          <div className="font-mono text-[10px] uppercase tracking-wider text-muted mt-4">
            revenue delta · ${revDelta.toFixed(2)}
          </div>
        </div>

        {/* Right column — Candidate B mini */}
        <div className="col-span-3 p-5 border-l border-hairline flex flex-col">
          <MiniCandidateInline
            arm="B"
            email={candidateB}
            isWinner={bIsWinner}
          />
        </div>
      </div>
    </div>
  );
}

function MiniCandidateInline({
  arm,
  email,
  isWinner,
}: {
  arm: "A" | "B";
  email: Email;
  isWinner: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header chip + WINNER label */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink">
          [{arm}]
        </span>
        {isWinner && (
          <span
            className="font-mono text-[10px] uppercase tracking-[0.15em] font-semibold"
            style={{ color: "var(--verdict-deep)" }}
          >
            winner
          </span>
        )}
      </div>

      {/* Email screenshot — winner gets green outline */}
      <div
        className={`flex-1 rounded-sm overflow-hidden ${
          isWinner ? "ring-2 ring-offset-2 ring-offset-card" : ""
        }`}
        style={isWinner ? { boxShadow: "0 0 0 2px var(--verdict)" } : undefined}
      >
        {email.previewScreenshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={email.previewScreenshotUrl}
            alt={email.subject}
            className="w-full h-full object-cover object-top bg-paper min-h-[260px]"
          />
        ) : (
          <div className="w-full h-full bg-paper flex items-center justify-center text-muted text-xs font-mono min-h-[260px]">
            no screenshot
          </div>
        )}
      </div>

      {/* Subject + brand */}
      <div className="mt-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {email.brandName}
        </div>
        <div className="font-display text-xs font-semibold text-ink leading-tight mt-0.5 line-clamp-2">
          {email.subject}
        </div>
      </div>
    </div>
  );
}

type DimFlags = {
  opened: boolean;
  clicked: boolean;
  purchased: boolean;
  revenue: boolean;
};

function CandidateCard({
  arm,
  email,
  opened,
  clicked,
  purchased,
  revenue,
  total,
  quotes,
  winsThisCard,
  losesThisCard,
}: {
  arm: "A" | "B";
  email: Email;
  opened: number;
  clicked: number;
  purchased: number;
  revenue: number;
  total: number;
  quotes: string[];
  winsThisCard: DimFlags;
  losesThisCard: DimFlags;
}) {
  return (
    <div className="bg-card border border-hairline rounded-md overflow-hidden">
      {/* Mono chip header — no color, just monospace */}
      <div className="px-5 py-3 border-b border-hairline flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-ink">
          [CANDIDATE {arm}]
        </span>
        <span className="text-xs text-muted">{email.brandName}</span>
      </div>

      {/* Email screenshot */}
      {email.previewScreenshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={email.previewScreenshotUrl}
          alt={email.subject}
          className="w-full max-h-80 object-cover object-top bg-paper border-b border-hairline"
        />
      ) : (
        <div className="w-full h-48 bg-paper border-b border-hairline flex items-center justify-center text-muted text-sm">
          no screenshot
        </div>
      )}

      {/* Subject + preheader */}
      <div className="px-5 py-4 border-b border-hairline">
        <h3 className="font-display text-xl font-semibold text-ink leading-tight">
          {email.subject}
        </h3>
        {email.preheader && (
          <p className="text-sm text-muted mt-1 leading-snug">
            {email.preheader}
          </p>
        )}
        <p className="text-xs text-muted mt-2 font-mono">{email.sender}</p>
      </div>

      {/* Stats — winner bolded, loser un-bolded + muted, on each dimension */}
      <div className="px-5 py-4 space-y-2.5">
        <StatRow
          label="opened"
          value={`${opened} / ${total}`}
          pct={pct(opened, total)}
          wins={winsThisCard.opened}
          loses={losesThisCard.opened}
        />
        <StatRow
          label="clicked"
          value={`${clicked} / ${total}`}
          pct={pct(clicked, total)}
          wins={winsThisCard.clicked}
          loses={losesThisCard.clicked}
        />
        <StatRow
          label="purchased"
          value={`${purchased} / ${total}`}
          pct={pct(purchased, total)}
          wins={winsThisCard.purchased}
          loses={losesThisCard.purchased}
        />
        <StatRow
          label="revenue"
          value={`$${revenue.toFixed(2)}`}
          big
          wins={winsThisCard.revenue}
          loses={losesThisCard.revenue}
        />
      </div>

      {/* Standout quotes */}
      {quotes.length > 0 && (
        <div className="px-5 py-4 border-t border-hairline bg-paper">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-3">
            what pulled customers in
          </div>
          <ul className="space-y-3">
            {quotes.map((q, i) => (
              <li
                key={i}
                className="border-l-2 border-hairline pl-3 text-sm text-ink italic leading-relaxed"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                &ldquo;{q}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  pct,
  big,
  wins,
  loses,
}: {
  label: string;
  value: string;
  pct?: string;
  big?: boolean;
  wins?: boolean;
  loses?: boolean;
}) {
  // Winner is bold + ink. Loser is normal weight + muted. Tie is medium + ink.
  const valueWeight = wins
    ? big
      ? "font-extrabold text-ink"
      : "font-bold text-ink"
    : loses
      ? big
        ? "font-light text-muted"
        : "font-normal text-muted"
      : big
        ? "font-semibold text-ink"
        : "font-semibold text-ink";
  const pctColor = loses ? "text-muted/60" : "text-muted";
  const labelColor = loses ? "text-muted/70" : "text-muted";

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className={`font-mono text-[10px] uppercase tracking-[0.15em] ${labelColor}`}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2 tabular-nums">
        {pct && <span className={`text-xs ${pctColor}`}>{pct}</span>}
        <span
          className={
            big
              ? `font-display text-2xl ${valueWeight}`
              : `text-sm ${valueWeight}`
          }
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function pickStandoutQuotes(
  agentRuns: AgentRunResult[],
  arm: "A" | "B",
  candidateId: string,
  n = 3,
): string[] {
  const armRuns = agentRuns.filter((r) => r.arm === arm);
  return armRuns
    .flatMap((r) => r.round2.clicks.filter((c) => c.emailId === candidateId))
    .map((c) => c.reason)
    .sort((a, b) => b.length - a.length)
    .slice(0, n)
    .map((r) => (r.length > 220 ? r.slice(0, 220).trim() + "…" : r));
}

function findTopQuotePersona(
  run: SavedRun,
  arm: "A" | "B",
): string | undefined {
  const candidateId = arm === "A" ? run.candidateA.id : run.candidateB.id;
  const armRuns = run.agentRuns.filter((r) => r.arm === arm);
  const best = armRuns
    .flatMap((r) =>
      r.round2.clicks
        .filter((c) => c.emailId === candidateId)
        .map((c) => ({ reason: c.reason, personaId: r.personaId })),
    )
    .sort((a, b) => b.reason.length - a.reason.length)[0];
  if (!best) return undefined;
  const persona = run.personas.find((p) => p.id === best.personaId);
  return persona ? `${persona.name}, ${persona.age}` : undefined;
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "0%";
  return `${Math.round((num / denom) * 100)}%`;
}
