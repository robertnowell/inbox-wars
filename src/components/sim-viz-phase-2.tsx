// Sim Viz — Phase 2 (CLICKS).
// Masonry of OPENED emails. As phase plays out, agents "click through" on
// some — those cards get highlighted and stack mini-avatars of clickers.
// Real data: emails from cached run, click events from agentRuns[].round2.clicks
// with real per-agent rationales.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SavedRun } from "@/lib/runs";
import type { Email } from "@/lib/types";
import { PersonaAvatar } from "./persona-avatar";
import { getDemoBrand } from "@/lib/fixtures/demo-brands";

type ClickEvent = {
  time: number; // seconds into phase (0–30)
  agentId: string;
  agentName: string;
  emailId: string;
  emailBrand: string;
  emailSubject: string;
  reason: string;
};

const PHASE_DURATION = 30;

function buildClickTimeline(run: SavedRun): ClickEvent[] {
  const personaById = new Map(run.personas.map((p) => [p.id, p]));
  const events: Omit<ClickEvent, "time">[] = [];

  // Sample real clicks from arm A
  for (const agentRun of run.agentRuns) {
    if (agentRun.arm !== "A") continue;
    const persona = personaById.get(agentRun.personaId);
    if (!persona) continue;
    for (const click of agentRun.round2.clicks) {
      const emailA = run.candidateA;
      const bg = run.backgroundEmails.find((e) => e.id === click.emailId);
      const email = emailA.id === click.emailId ? emailA : bg;
      if (!email) continue;
      events.push({
        agentId: persona.id,
        agentName: persona.name,
        emailId: email.id,
        emailBrand: email.brandName,
        emailSubject: email.subject,
        reason: click.reason,
      });
    }
  }

  // Spread evenly across PHASE_DURATION with breathing room
  const total = events.length;
  return events.map((e, i) => {
    const t = total > 1 ? i / (total - 1) : 0.5;
    const time = 2 + t * (PHASE_DURATION - 4);
    return { ...e, time };
  });
}

export function SimVizPhase2({
  run,
  elapsed,
}: {
  run: SavedRun;
  elapsed: number; // seconds into THIS phase (0..30), not total
}) {
  const timeline = useMemo(() => buildClickTimeline(run), [run]);

  // Which emails were opened in arm A — these are the masonry cards
  const openedEmails: Email[] = useMemo(() => {
    const openedIds = new Set<string>();
    for (const agentRun of run.agentRuns) {
      if (agentRun.arm !== "A") continue;
      for (const o of agentRun.round1.opens) openedIds.add(o.emailId);
    }
    // Always include candidate even if no opens (edge case)
    openedIds.add(run.candidateA.id);
    const all = [run.candidateA, ...run.backgroundEmails];
    return all.filter((e) => openedIds.has(e.id));
  }, [run]);

  // State: map of emailId -> array of agents that clicked it (in arrival order)
  const [clicksByEmail, setClicksByEmail] = useState<
    Map<string, { agentId: string; agentName: string; reason: string }[]>
  >(new Map());
  const [feed, setFeed] = useState<ClickEvent[]>([]);
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    let changed = false;
    const newClicks = new Map(clicksByEmail);
    const newFeed = [...feed];
    for (let i = 0; i < timeline.length; i++) {
      if (firedRef.current.has(i)) continue;
      const ev = timeline[i];
      if (elapsed >= ev.time) {
        firedRef.current.add(i);
        const arr = newClicks.get(ev.emailId) ?? [];
        arr.push({ agentId: ev.agentId, agentName: ev.agentName, reason: ev.reason });
        newClicks.set(ev.emailId, arr);
        newFeed.unshift(ev);
        changed = true;
      }
    }
    if (changed) {
      setClicksByEmail(newClicks);
      setFeed(newFeed.slice(0, 6));
    }
  }, [elapsed, timeline, clicksByEmail, feed]);

  // For the candidate, pull screenshot from fixtures (Rendit URL).
  // For background emails, use the heroImageUrl baked into the run by the patch.
  const demoBrand = getDemoBrand(run.brandId);
  const candidateScreenshot =
    demoBrand?.emails.find((e) => e.chatId === run.candidateA.id)?.screenshotUrl;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6">
      {/* LEFT: Masonry */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            opened emails · {openedEmails.length}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            phase 2 · click-through
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-min">
          {openedEmails.map((email) => {
            const isTest = email.id === run.candidateA.id;
            const clickers = clicksByEmail.get(email.id) ?? [];
            const shot = isTest ? candidateScreenshot : email.heroImageUrl;
            return (
              <EmailCard
                key={email.id}
                email={email}
                isTest={isTest}
                clickers={clickers}
                screenshotUrl={shot}
              />
            );
          })}
        </div>
      </section>

      {/* RIGHT: live feed (click events) */}
      <section className="flex flex-col gap-4">
        <FeedSummary clicksByEmail={clicksByEmail} totalAgents={run.personas.length} />
        <ClickFeed feed={feed} />
      </section>
    </div>
  );
}

/* ───────────────── Email Card ───────────────── */

function EmailCard({
  email,
  isTest,
  clickers,
  screenshotUrl,
}: {
  email: Email;
  isTest: boolean;
  clickers: { agentId: string; agentName: string; reason: string }[];
  screenshotUrl?: string;
}) {
  const clicked = clickers.length > 0;
  return (
    <div
      className={[
        "bg-card border rounded-md overflow-hidden flex flex-col transition-all",
        clicked ? "border-ink" : "border-hairline",
        isTest ? "sm:col-span-2 sm:row-span-2" : "",
      ].join(" ")}
    >
      {/* Top strip */}
      <div className="px-4 py-2 border-b border-hairline flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isTest && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink shrink-0">
              [A]
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted truncate">
            {email.brandName}
          </span>
        </div>
        {clicked && (
          <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-ink text-paper rounded-sm shrink-0">
            {clickers.length} click{clickers.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {/* Subject + screenshot/preview */}
      <div className="px-4 py-3 flex-1 flex flex-col">
        <div
          className={[
            "font-display font-semibold leading-tight",
            isTest ? "text-base" : "text-sm",
            clicked ? "text-ink" : "text-ink",
          ].join(" ")}
        >
          {email.subject}
        </div>
        {email.preheader && (
          <div className="text-xs text-muted mt-1 line-clamp-2">
            {email.preheader}
          </div>
        )}
        {/* Body: screenshot if we have it, otherwise styled body-text excerpt */}
        {screenshotUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={screenshotUrl}
            alt={email.subject}
            className={[
              "mt-3 w-full object-cover object-top rounded-sm border border-hairline",
              isTest ? "max-h-96" : "max-h-32",
            ].join(" ")}
          />
        ) : (
          <div className="mt-3 flex-1 bg-paper border border-hairline rounded-sm p-3 text-[11px] leading-snug text-muted line-clamp-4 italic">
            &ldquo;{(email.bodyText ?? "").slice(0, 200)}…&rdquo;
          </div>
        )}
      </div>
      {/* Footer: clickers' avatars */}
      {clicked && (
        <div className="px-4 py-2 border-t border-hairline bg-paper flex items-center gap-2">
          <div className="flex -space-x-2">
            {clickers.slice(0, 5).map((c) => (
              <div key={c.agentId} className="ring-2 ring-paper rounded-full">
                <PersonaAvatar id={c.agentId} name={c.agentName} size="sm" />
              </div>
            ))}
            {clickers.length > 5 && (
              <span className="ml-2 font-mono text-[10px] text-muted self-center">
                +{clickers.length - 5}
              </span>
            )}
          </div>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted truncate">
            clicked through
          </span>
        </div>
      )}
    </div>
  );
}

/* ───────────────── Feed Summary ───────────────── */

function FeedSummary({
  clicksByEmail,
  totalAgents,
}: {
  clicksByEmail: Map<string, unknown[]>;
  totalAgents: number;
}) {
  const totalClicks = Array.from(clicksByEmail.values()).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  return (
    <div className="bg-card border border-hairline rounded-md p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">
        click-through round
      </div>
      <div className="flex items-baseline gap-3">
        <div className="font-display text-3xl font-extrabold text-ink tabular-nums">
          {totalClicks}
        </div>
        <div className="text-xs text-muted">
          of {totalAgents * 5} possible clicks
          <br />
          ({totalAgents} agents × up to 5 each)
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Click Feed ───────────────── */

function ClickFeed({ feed }: { feed: ClickEvent[] }) {
  return (
    <div className="bg-card border border-hairline rounded-md flex-1 min-h-[280px] flex flex-col overflow-hidden">
      <div className="px-4 py-2 border-b border-hairline bg-paper flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          live action feed
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      </div>
      {feed.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted font-mono">
          agents deciding what to click…
        </div>
      ) : (
        <ul className="divide-y divide-hairline flex-1 overflow-hidden">
          {feed.map((ev, i) => (
            <li
              key={`${ev.agentId}-${ev.emailId}-${i}`}
              className={[
                "px-4 py-2.5 text-xs leading-snug",
                i === 0 ? "bg-paper/80" : "",
              ].join(" ")}
              style={{ opacity: 1 - i * 0.12 }}
            >
              <div className="flex items-start gap-1 flex-wrap">
                <span className="font-semibold text-ink">{ev.agentName}</span>
                <span className="text-muted">clicked through on</span>
                <span className="font-semibold text-ink truncate">
                  {ev.emailBrand}
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
