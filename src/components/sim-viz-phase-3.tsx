// Sim Viz — Phase 3 (PURCHASES).
// Product cards on the left with thumbnails + animated buyer counts.
// Revenue counter on the right + live purchase feed.
// Real data: products from run.productsById, purchases from agentRuns[].round3.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SavedRun } from "@/lib/runs";
import type { Product } from "@/lib/types";
import { PersonaAvatar } from "./persona-avatar";

type BuyEvent = {
  time: number; // seconds into phase (0..30)
  agentId: string;
  agentName: string;
  productId: string;
  productName: string;
  spent: number;
  reason: string;
};

const PHASE_DURATION = 30;

function buildBuyTimeline(run: SavedRun): BuyEvent[] {
  const personaById = new Map(run.personas.map((p) => [p.id, p]));
  const events: Omit<BuyEvent, "time">[] = [];

  // Build a product-name lookup that falls through productsById, then
  // candidateAProducts, then candidateBProducts so we always have a name.
  const productNameById = new Map<string, string>();
  for (const p of Object.values(run.productsById ?? {})) {
    productNameById.set(p.id, p.name);
  }
  for (const p of run.candidateAProducts ?? []) productNameById.set(p.id, p.name);
  for (const p of run.candidateBProducts ?? []) productNameById.set(p.id, p.name);

  // Source purchases from BOTH arms — both candidates contribute revenue
  for (const agentRun of run.agentRuns) {
    const persona = personaById.get(agentRun.personaId);
    if (!persona) continue;
    for (const p of agentRun.round3.purchases) {
      events.push({
        agentId: persona.id,
        agentName: persona.name,
        productId: p.productId,
        productName: productNameById.get(p.productId) ?? "Unknown product",
        spent: p.spent,
        reason: p.reason,
      });
    }
  }

  const total = events.length;
  return events.map((e, i) => {
    const t = total > 1 ? i / (total - 1) : 0.5;
    const time = 2 + t * (PHASE_DURATION - 4);
    return { ...e, time };
  });
}

export function SimVizPhase3({
  run,
  elapsed,
}: {
  run: SavedRun;
  elapsed: number;
}) {
  const timeline = useMemo(() => buildBuyTimeline(run), [run]);

  // Products surfaced to the agent for each candidate email.
  // Prefer server-augmented candidateAProducts / candidateBProducts (mediaPlan +
  // embedding-closest fallback — always ≥1 product per email if the brand has any).
  // Falls back to productsById (purchases only) for older cached runs.
  const products: Product[] = useMemo(() => {
    const a = run.candidateAProducts ?? [];
    const b = run.candidateBProducts ?? [];
    if (a.length > 0 || b.length > 0) {
      // De-dup by product id (A and B may share a product if no mediaPlan and embeddings overlap)
      const seen = new Set<string>();
      const merged: Product[] = [];
      for (const p of [...a, ...b]) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push(p);
      }
      return merged;
    }
    // Legacy fallback: only products that were purchased
    const byId = run.productsById ?? {};
    return Object.values(byId).filter(
      (p) => p.brandId === run.candidateA.brandId,
    );
  }, [run]);

  const [buyersByProduct, setBuyersByProduct] = useState<
    Map<string, { agentId: string; agentName: string; spent: number }[]>
  >(new Map());
  const [feed, setFeed] = useState<BuyEvent[]>([]);
  const firedRef = useRef<Set<number>>(new Set());
  const [revenue, setRevenue] = useState(0);
  const [pulse, setPulse] = useState(0); // bumps on every purchase

  useEffect(() => {
    let changed = false;
    const newBuyers = new Map(buyersByProduct);
    const newFeed = [...feed];
    let newRev = revenue;
    for (let i = 0; i < timeline.length; i++) {
      if (firedRef.current.has(i)) continue;
      const ev = timeline[i];
      if (elapsed >= ev.time) {
        firedRef.current.add(i);
        const arr = newBuyers.get(ev.productId) ?? [];
        arr.push({ agentId: ev.agentId, agentName: ev.agentName, spent: ev.spent });
        newBuyers.set(ev.productId, arr);
        newFeed.unshift(ev);
        newRev += ev.spent;
        changed = true;
      }
    }
    if (changed) {
      setBuyersByProduct(newBuyers);
      setFeed(newFeed.slice(0, 6));
      setRevenue(newRev);
      setPulse((p) => p + 1);
    }
  }, [elapsed, timeline, buyersByProduct, feed, revenue]);

  const totalBuyers = Array.from(buyersByProduct.values()).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6">
      {/* LEFT: Products grid */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            products available · {products.length}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            phase 3 · purchase decisions
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              buyers={buyersByProduct.get(p.id) ?? []}
            />
          ))}
        </div>
      </section>

      {/* RIGHT: revenue counter + feed */}
      <section className="flex flex-col gap-4">
        <RevenueCounter
          revenue={revenue}
          buyers={totalBuyers}
          totalAgents={run.personas.length}
          pulse={pulse}
        />
        <BuyFeed feed={feed} />
      </section>
    </div>
  );
}

/* ───────────────── Product Card ───────────────── */

function ProductCard({
  product,
  buyers,
}: {
  product: Product;
  buyers: { agentId: string; agentName: string; spent: number }[];
}) {
  const bought = buyers.length > 0;
  return (
    <div
      className={[
        "bg-card border rounded-md overflow-hidden flex flex-col transition-all",
        bought ? "border-ink" : "border-hairline",
      ].join(" ")}
    >
      <div className="aspect-square bg-paper border-b border-hairline overflow-hidden flex items-center justify-center">
        {product.thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.thumbnailUrl}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            no thumbnail
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex-1 flex flex-col">
        <div className="font-display text-sm font-semibold text-ink leading-tight line-clamp-2">
          {product.name}
        </div>
        <div className="mt-2 font-mono text-base font-semibold text-ink tabular-nums">
          ${product.price.toFixed(2)}
        </div>
        {bought ? (
          <div className="mt-3 pt-3 border-t border-hairline">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex -space-x-2">
                {buyers.slice(0, 5).map((b) => (
                  <div key={b.agentId} className="ring-2 ring-card rounded-full">
                    <PersonaAvatar id={b.agentId} name={b.agentName} size="sm" />
                  </div>
                ))}
                {buyers.length > 5 && (
                  <span className="ml-2 font-mono text-[10px] text-muted self-center">
                    +{buyers.length - 5}
                  </span>
                )}
              </div>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-ink text-paper rounded-sm">
                {buyers.length} bought
              </span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">
              ${(buyers.length * product.price).toFixed(2)} revenue
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-wider text-muted">
            no buyers yet
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────── Revenue Counter ───────────────── */

function RevenueCounter({
  revenue,
  buyers,
  totalAgents,
  pulse,
}: {
  revenue: number;
  buyers: number;
  totalAgents: number;
  pulse: number;
}) {
  const [bumped, setBumped] = useState(false);
  useEffect(() => {
    if (pulse === 0) return;
    setBumped(true);
    const t = setTimeout(() => setBumped(false), 400);
    return () => clearTimeout(t);
  }, [pulse]);

  return (
    <div
      className={[
        "bg-card border border-hairline rounded-md p-5 transition-transform duration-200",
        bumped ? "scale-[1.02]" : "",
      ].join(" ")}
      style={{ borderColor: bumped ? "var(--verdict-deep, #00a070)" : undefined }}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
        simulated revenue (arm a)
      </div>
      <div className="font-display text-5xl font-extrabold text-ink tabular-nums leading-none">
        ${revenue.toFixed(2)}
      </div>
      <div className="mt-3 flex items-baseline gap-2 text-xs text-muted">
        <span className="font-mono tabular-nums text-ink font-semibold">
          {buyers}/{totalAgents}
        </span>
        <span>agents purchased</span>
      </div>
    </div>
  );
}

/* ───────────────── Buy Feed ───────────────── */

function BuyFeed({ feed }: { feed: BuyEvent[] }) {
  return (
    <div className="bg-card border border-hairline rounded-md flex-1 min-h-[280px] flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-hairline bg-paper flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          purchase decisions
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      </div>
      {feed.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted font-mono">
          agents deciding what to buy…
        </div>
      ) : (
        <ul className="divide-y divide-hairline flex-1 overflow-hidden">
          {feed.map((ev, i) => (
            <li
              key={`${ev.agentId}-${i}`}
              className={[
                "px-4 py-2.5 text-xs leading-snug",
                i === 0 ? "bg-paper/80" : "",
              ].join(" ")}
              style={{ opacity: 1 - i * 0.12 }}
            >
              <div className="flex items-start gap-1 flex-wrap">
                <span className="font-semibold text-ink">{ev.agentName}</span>
                <span className="text-muted">bought</span>
                <span className="font-semibold text-ink truncate">
                  {ev.productName}
                </span>
                <span
                  className="ml-auto font-mono tabular-nums font-semibold"
                  style={{ color: "var(--verdict-deep, #00a070)" }}
                >
                  ${ev.spent.toFixed(2)}
                </span>
              </div>
              <div
                className="text-muted italic mt-0.5 line-clamp-2"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                &ldquo;{ev.reason}&rdquo;
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
