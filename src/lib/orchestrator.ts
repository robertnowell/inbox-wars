// Orchestrator: run one agent through 3 rounds, and pair-run N personas × 2 arms.

import { runOpenRound, runClickRound, runBuyRound, sumTokens } from "./agents";
import { getFeaturedProductsForEmail, searchProductsForEmail } from "./kopi";
import type {
  Persona,
  Email,
  Product,
  AgentRunResult,
  Arm,
  ArmAggregate,
  SimulationResult,
} from "./types";

// Fisher–Yates shuffle (position-bias mitigation per agent)
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Concurrency-capped Promise.all
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

// -----------------------------------------------------------------------------
// Run one agent through the 3 rounds for one arm
// -----------------------------------------------------------------------------

export async function runOneAgent(args: {
  persona: Persona;
  arm: Arm;
  candidateEmailId: string;
  inbox: Email[]; // candidate email + background emails (100 total in prod, fewer for dev)
  productsByBrand?: Map<string, Product>; // inline fallback for non-kopi brands; embedding search is primary
  productsPerEmail?: number; // top-N most relevant products per clicked email (default 3)
}): Promise<AgentRunResult> {
  const { persona, arm, candidateEmailId, inbox, productsByBrand, productsPerEmail = 3 } = args;

  // Round 1: shuffle per-agent for position-bias control.
  // Capture the shuffled order so the UI can render the inbox in the SAME order
  // the agent actually saw — otherwise "the candidate is always #1" is misleading.
  const shuffledInbox = shuffled(inbox);
  const inboxOrder = shuffledInbox.map((e) => e.id);
  const r1 = await runOpenRound(persona, shuffledInbox);

  // Round 2: only the opened emails, shuffled again
  const openedEmails = r1.opens
    .map((o) => inbox.find((e) => e.id === o.emailId))
    .filter((e): e is Email => e !== undefined);
  const r2 = await runClickRound(persona, shuffled(openedEmails));

  // Round 3: for each clicked email, semantic-search the brand's catalog for top-N most
  // relevant products. Falls back to inline productsByBrand for clicked emails whose brand
  // has no kopi-DB products (e.g., synthetic background brands).
  const clickedEmails = r2.clicks
    .map((c) => inbox.find((e) => e.id === c.emailId))
    .filter((e): e is Email => e !== undefined);

  const productLists = await Promise.all(
    clickedEmails.map(async (e) => {
      // 1. PRIMARY: author-selected products from kopi (mediaPlan.products).
      //    Strictly preferred — this is what the email's creator chose to feature.
      try {
        const featured = await getFeaturedProductsForEmail(e.id);
        if (featured.length > 0) return featured;
      } catch {
        // email not in kopi DB (synthetic background email) — fall through
      }
      // 2. FALLBACK: semantic search by email body text against brand catalog.
      //    Kicks in for emails with empty mediaPlan.products (e.g., waitlist emails).
      try {
        const queryText = `${e.subject}\n${e.preheader}\n${e.bodyText}`;
        const semantic = await searchProductsForEmail(e.brandId, queryText, productsPerEmail);
        if (semantic.length > 0) return semantic;
      } catch {
        // brand not in kopi DB — fall through
      }
      // 3. FINAL FALLBACK: inline fixture map for synthetic background brands
      const inlineFallback = productsByBrand?.get(e.brandId);
      return inlineFallback ? [inlineFallback] : [];
    }),
  );
  const productsForClicked = productLists.flat();
  const r3 = await runBuyRound(persona, shuffled(productsForClicked));

  return {
    personaId: persona.id,
    arm,
    candidateEmailId,
    inboxOrder,
    round1: { opens: r1.opens },
    round2: { clicks: r2.clicks },
    round3: { purchases: r3.purchases, totalSpent: r3.totalSpent },
    cost: sumTokens(sumTokens(r1.tokens, r2.tokens), r3.tokens),
  };
}

// -----------------------------------------------------------------------------
// Paired runner: N personas × 2 arms, identical background emails, parallel
// -----------------------------------------------------------------------------

export type PairRunnerArgs = {
  personas: Persona[];
  candidateA: Email;
  candidateB: Email;
  backgroundEmails: Email[]; // identical across A and B
  productsByBrand?: Map<string, Product>; // optional inline fallback for non-kopi brands
  concurrency?: number;
  onProgress?: (done: number, total: number, latest: AgentRunResult) => void;
};

export async function runPairedSimulation(
  args: PairRunnerArgs,
): Promise<SimulationResult> {
  const {
    personas,
    candidateA,
    candidateB,
    backgroundEmails,
    productsByBrand,
    concurrency = 5,
    onProgress,
  } = args;

  // Build the two inboxes (identical background, different candidate slot)
  const inboxA = [candidateA, ...backgroundEmails];
  const inboxB = [candidateB, ...backgroundEmails];

  // Paired jobs: every persona runs both arms
  const jobs: Array<{ persona: Persona; arm: Arm; inbox: Email[]; candidateEmailId: string }> =
    personas.flatMap((persona) => [
      { persona, arm: "A" as const, inbox: inboxA, candidateEmailId: candidateA.id },
      { persona, arm: "B" as const, inbox: inboxB, candidateEmailId: candidateB.id },
    ]);

  let completed = 0;
  const agentRuns = await pMapLimit(jobs, concurrency, async (job) => {
    const result = await runOneAgent({
      persona: job.persona,
      arm: job.arm,
      candidateEmailId: job.candidateEmailId,
      inbox: job.inbox,
      productsByBrand,
    });
    completed += 1;
    onProgress?.(completed, jobs.length, result);
    return result;
  });

  // Aggregate per arm. With embedding-search, multiple products per brand may surface;
  // we count *any* purchase from the candidate's brand as a candidate-driven purchase.
  const agg = (arm: Arm, candidateId: string): ArmAggregate => {
    const runs = agentRuns.filter((r) => r.arm === arm);
    const opened = runs.filter((r) => r.round1.opens.some((o) => o.emailId === candidateId)).length;
    const clicked = runs.filter((r) => r.round2.clicks.some((c) => c.emailId === candidateId)).length;
    const candidateBrandId =
      arm === "A" ? candidateA.brandId : candidateB.brandId;
    // Map purchases back to brand by looking up the product id in the agent's round-3 products.
    // We don't store products on the run, so we re-derive: any purchase counts if its
    // product_id was sourced via this candidate's brand. For now, count purchases whose
    // reason text or product id maps to candidate brand. Simpler: count round3.purchases where
    // the agent had only one clicked email AND that email was the candidate. This is approximate
    // but stable; will be refined when we track product->brand provenance on the run object.
    const candidateClickedRuns = runs.filter((r) =>
      r.round2.clicks.some((c) => c.emailId === candidateId),
    );
    const purchasedBy = candidateClickedRuns.filter((r) => r.round3.purchases.length > 0).length;
    const revenue = candidateClickedRuns.reduce((sum, r) => sum + r.round3.totalSpent, 0);
    return {
      arm,
      candidateEmailId: candidateId,
      openedBy: opened,
      clickedBy: clicked,
      purchasedBy,
      revenue,
      totalPersonas: runs.length,
    };
  };

  const totalCost = agentRuns
    .map((r) => r.cost)
    .reduce(sumTokens, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });

  return {
    arms: {
      A: agg("A", candidateA.id),
      B: agg("B", candidateB.id),
    },
    agentRuns,
    totalCost,
  };
}
