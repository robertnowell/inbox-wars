// The rich paired view shown when a persona row is expanded.
// Three stacked sections, each split into two equal-weight columns (no team colors).

import type { AgentRunResult, Email, Persona, Product } from "@/lib/types";
import { EmailCard } from "./email-card";
import { GmailInbox } from "./gmail-inbox";
import { ProductCard } from "./product-card";

export function PersonaExpanded({
  persona,
  runA,
  runB,
  candidateA,
  candidateB,
  backgroundEmails,
  productsById,
}: {
  persona: Persona;
  runA: AgentRunResult;
  runB: AgentRunResult;
  candidateA: Email;
  candidateB: Email;
  backgroundEmails: Email[];
  productsById: Record<string, Product>;
}) {
  // Render the inbox in the SAME shuffled order the agent actually saw,
  // not the default [candidate, ...background] order which always puts candidate at #1.
  const allA = [candidateA, ...backgroundEmails];
  const allB = [candidateB, ...backgroundEmails];
  const orderA = runA.inboxOrder ?? allA.map((e) => e.id);
  const orderB = runB.inboxOrder ?? allB.map((e) => e.id);
  const inboxA = orderA
    .map((id) => allA.find((e) => e.id === id))
    .filter((e): e is Email => e !== undefined);
  const inboxB = orderB
    .map((id) => allB.find((e) => e.id === id))
    .filter((e): e is Email => e !== undefined);

  const openedA = new Set(runA.round1.opens.map((o) => o.emailId));
  const openedB = new Set(runB.round1.opens.map((o) => o.emailId));
  const clickedA = new Set(runA.round2.clicks.map((c) => c.emailId));
  const clickedB = new Set(runB.round2.clicks.map((c) => c.emailId));

  const reasonsA = new Map(runA.round2.clicks.map((c) => [c.emailId, c.reason]));
  const reasonsB = new Map(runB.round2.clicks.map((c) => [c.emailId, c.reason]));

  const clickedEmailsA = runA.round2.clicks
    .map((c) => inboxA.find((e) => e.id === c.emailId))
    .filter((e): e is Email => e !== undefined);
  const clickedEmailsB = runB.round2.clicks
    .map((c) => inboxB.find((e) => e.id === c.emailId))
    .filter((e): e is Email => e !== undefined);

  return (
    <div className="bg-paper border-t border-hairline px-6 py-8">
      {/* Long profile — the persona's voice */}
      <div className="mb-8 bg-card border border-hairline rounded-md px-5 py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-2">
          profile · first person
        </div>
        <p
          className="text-sm text-ink italic leading-relaxed"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          &ldquo;{persona.longProfile}&rdquo;
        </p>
      </div>

      {/* SECTION 1: Inbox */}
      <SectionHeader>inbox</SectionHeader>
      <div className="grid grid-cols-2 gap-4 mb-10">
        <ArmColumn arm="A">
          <GmailInbox
            emails={inboxA}
            openedIds={openedA}
            clickedIds={clickedA}
            highlightId={candidateA.id}
          />
        </ArmColumn>
        <ArmColumn arm="B">
          <GmailInbox
            emails={inboxB}
            openedIds={openedB}
            clickedIds={clickedB}
            highlightId={candidateB.id}
          />
        </ArmColumn>
      </div>

      {/* SECTION 2: Clicked emails */}
      <SectionHeader>what they clicked</SectionHeader>
      <div className="grid grid-cols-2 gap-4 mb-10">
        <ArmColumn arm="A">
          {clickedEmailsA.length === 0 ? (
            <EmptyState>didn&rsquo;t click anything</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {clickedEmailsA.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  reason={reasonsA.get(email.id)}
                  isCandidate={email.id === candidateA.id}
                />
              ))}
            </div>
          )}
        </ArmColumn>
        <ArmColumn arm="B">
          {clickedEmailsB.length === 0 ? (
            <EmptyState>didn&rsquo;t click anything</EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {clickedEmailsB.map((email) => (
                <EmailCard
                  key={email.id}
                  email={email}
                  reason={reasonsB.get(email.id)}
                  isCandidate={email.id === candidateB.id}
                />
              ))}
            </div>
          )}
        </ArmColumn>
      </div>

      {/* SECTION 3: Purchase */}
      <SectionHeader>what they bought</SectionHeader>
      <div className="grid grid-cols-2 gap-4">
        <ArmColumn arm="A">
          <PurchaseList
            purchases={runA.round3.purchases}
            totalSpent={runA.round3.totalSpent}
            productsById={productsById}
          />
        </ArmColumn>
        <ArmColumn arm="B">
          <PurchaseList
            purchases={runB.round3.purchases}
            totalSpent={runB.round3.totalSpent}
            productsById={productsById}
          />
        </ArmColumn>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-semibold text-ink">
        {children}
      </span>
      <div className="flex-1 border-t border-hairline" />
    </div>
  );
}

function ArmColumn({
  arm,
  children,
}: {
  arm: "A" | "B";
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
        [arm {arm}]
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-hairline rounded-md py-10 text-center text-sm text-muted italic">
      {children}
    </div>
  );
}

function PurchaseList({
  purchases,
  totalSpent,
  productsById,
}: {
  purchases: AgentRunResult["round3"]["purchases"];
  totalSpent: number;
  productsById: Record<string, Product>;
}) {
  if (purchases.length === 0) {
    return (
      <div className="border border-dashed border-hairline rounded-md py-10 text-center">
        <div className="text-sm text-muted italic">didn&rsquo;t buy anything</div>
        <div className="font-mono text-xs text-muted mt-2">$0.00 spent</div>
      </div>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-1 gap-3">
        {purchases.map((p) => {
          const product = productsById[p.productId];
          if (!product) return null;
          return (
            <ProductCard
              key={p.productId}
              product={product}
              spent={p.spent}
              reason={p.reason}
            />
          );
        })}
      </div>
      <div className="mt-3 text-right font-mono text-xs text-ink font-semibold tabular-nums">
        total · ${totalSpent.toFixed(2)}
      </div>
    </div>
  );
}
