// Sim Viz — Phase 1 (OPENS).
// Big Gmail-style inbox animates as agents read it.
// Uses REAL data from run.agentRuns[].round1.opens — real subjects, real preheaders,
// real per-agent rationales. The TIMING is fudged: events are staggered across
// the phase duration to play out as a 30-second beat.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SavedRun } from "@/lib/runs";
import type { Email } from "@/lib/types";
import { PersonaAvatar } from "./persona-avatar";

type OpenEvent = {
  time: number; // seconds into phase
  agentId: string;
  agentName: string;
  emailId: string;
  emailBrand: string;
  emailSubject: string;
  reason: string;
};

const PHASE_DURATION = 30; // seconds

function buildEventTimeline(run: SavedRun): OpenEvent[] {
  // Pull real opens from arm A's runs. Stagger them across the phase duration.
  // Cycle agents so every persona gets airtime; pick 2-3 opens each.
  const personaById = new Map(run.personas.map((p) => [p.id, p]));
  const events: Omit<OpenEvent, "time">[] = [];

  // Round-robin through agents, sampling up to 2 opens per agent
  for (let pass = 0; pass < 3; pass++) {
    for (const agentRun of run.agentRuns) {
      if (agentRun.arm !== "A") continue;
      const persona = personaById.get(agentRun.personaId);
      if (!persona) continue;
      const opens = agentRun.round1.opens;
      if (pass >= opens.length) continue;
      const op = opens[pass];
      // Find email metadata
      const emailA = run.candidateA;
      const bg = run.backgroundEmails.find((e) => e.id === op.emailId);
      const email = emailA.id === op.emailId ? emailA : bg;
      if (!email) continue;
      events.push({
        agentId: persona.id,
        agentName: persona.name,
        emailId: email.id,
        emailBrand: email.brandName,
        emailSubject: email.subject,
        reason: op.reason,
      });
    }
  }

  // Distribute across PHASE_DURATION with a slight ease-in (front-load slightly)
  const total = events.length;
  return events.map((e, i) => {
    const t = (i + 0.5) / total; // 0..1
    // Compress to leave ~3s of breathing room at start and ~2s at end
    const time = 3 + t * (PHASE_DURATION - 5);
    return { ...e, time };
  });
}

export function SimVizPhase1({
  run,
  elapsed,
}: {
  run: SavedRun;
  elapsed: number; // seconds into the phase
}) {
  const timeline = useMemo(() => buildEventTimeline(run), [run]);
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<OpenEvent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Fire any events whose time has passed since last tick
    const newOpened = new Set(openedIds);
    const newFeed = [...feed];
    let newActive = activeAgentId;
    let changed = false;
    for (let i = 0; i < timeline.length; i++) {
      if (firedRef.current.has(i)) continue;
      const ev = timeline[i];
      if (elapsed >= ev.time) {
        firedRef.current.add(i);
        newOpened.add(ev.emailId);
        newFeed.unshift(ev);
        newActive = ev.agentId;
        changed = true;
      }
    }
    if (changed) {
      setOpenedIds(newOpened);
      setFeed(newFeed.slice(0, 6));
      setActiveAgentId(newActive);
    }
  }, [elapsed, timeline, openedIds, feed, activeAgentId]);

  // The 10-email inbox shown: test email A first, then background emails
  const inbox: Email[] = useMemo(() => {
    return [run.candidateA, ...run.backgroundEmails];
  }, [run]);

  const totalOpens = openedIds.size;
  const totalInbox = 100; // representative figure shown to user

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6">
      {/* LEFT: Gmail-style inbox */}
      <section className="bg-card border border-hairline rounded-md overflow-hidden">
        {/* Inbox chrome */}
        <div className="px-4 py-2 border-b border-hairline bg-paper flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400/60" />
          <span className="w-2 h-2 rounded-full bg-yellow-400/60" />
          <span className="w-2 h-2 rounded-full bg-green-400/60" />
          <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-muted">
            gmail · {run.brandName} target customer
          </span>
          <span className="ml-auto font-mono text-[10px] text-muted tabular-nums">
            {totalOpens} opened
          </span>
        </div>
        {/* Tab strip */}
        <div className="flex border-b border-hairline bg-paper">
          <div className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            primary
          </div>
          <div
            className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider font-semibold text-ink"
            style={{ borderBottom: "2px solid var(--ink)" }}
          >
            promotions
          </div>
          <div className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            updates
          </div>
        </div>
        {/* Rows */}
        <ul className="divide-y divide-hairline">
          {inbox.map((e) => {
            const opened = openedIds.has(e.id);
            const isTest = e.id === run.candidateA.id;
            return (
              <li
                key={e.id}
                className={[
                  "flex items-center gap-3 px-4 py-3 transition-colors duration-300",
                  opened ? "bg-paper" : "",
                ].join(" ")}
              >
                {/* Star / dot */}
                <span
                  className={[
                    "w-4 text-sm shrink-0 text-center",
                    isTest
                      ? "text-ink"
                      : opened
                        ? "text-ink/70"
                        : "text-hairline",
                  ].join(" ")}
                >
                  {isTest ? "★" : opened ? "●" : "○"}
                </span>
                {/* Sender */}
                <span
                  className={[
                    "w-36 truncate text-sm shrink-0",
                    opened ? "font-semibold text-ink" : "font-medium text-muted",
                  ].join(" ")}
                >
                  {e.brandName}
                </span>
                {/* Subject + preheader */}
                <span className="flex-1 truncate text-sm min-w-0">
                  <span
                    className={
                      opened ? "font-semibold text-ink" : "font-normal text-muted"
                    }
                  >
                    {e.subject}
                  </span>
                  {e.preheader && (
                    <span className="text-muted"> — {e.preheader}</span>
                  )}
                </span>
                {/* Opened status */}
                {opened && (
                  <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-ink/30 text-ink rounded-sm shrink-0">
                    opened
                  </span>
                )}
                {isTest && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink shrink-0 ml-1">
                    [A]
                  </span>
                )}
              </li>
            );
          })}
          <li className="px-4 py-2 text-xs text-muted text-center bg-paper/50">
            + {totalInbox - inbox.length} more emails in this inbox
          </li>
        </ul>
      </section>

      {/* RIGHT: Agent pool + Live feed */}
      <section className="flex flex-col gap-4 min-h-0">
        <AgentPool
          run={run}
          activeAgentId={activeAgentId}
        />
        <LiveFeed feed={feed} />
      </section>
    </div>
  );
}

/* ───────────────── Agent Pool ───────────────── */

function AgentPool({
  run,
  activeAgentId,
}: {
  run: SavedRun;
  activeAgentId: string | null;
}) {
  return (
    <div className="bg-card border border-hairline rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          agent pool
        </div>
        <div className="font-mono text-[10px] text-muted tabular-nums">
          {run.personas.length} reading
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {run.personas.map((p) => {
          const active = p.id === activeAgentId;
          return (
            <div key={p.id} className="flex flex-col items-center gap-1">
              <div
                className={[
                  "relative transition-all duration-300",
                  active ? "scale-110" : "scale-100",
                ].join(" ")}
                style={{
                  filter: active ? "none" : "grayscale(0.4)",
                }}
              >
                <PersonaAvatar id={p.id} name={p.name} size="lg" />
                {active && (
                  <span
                    className="absolute -inset-1 rounded-full border-2 pointer-events-none animate-pulse"
                    style={{ borderColor: "var(--ink)" }}
                  />
                )}
              </div>
              <div
                className={[
                  "text-[10px] leading-tight text-center max-w-full truncate font-mono",
                  active ? "text-ink font-semibold" : "text-muted",
                ].join(" ")}
              >
                {p.name.split(" ")[0]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── Live Feed ───────────────── */

function LiveFeed({ feed }: { feed: OpenEvent[] }) {
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
          waiting for agents…
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
              <div className="flex items-start gap-1">
                <span className="font-semibold text-ink">{ev.agentName}</span>
                <span className="text-muted"> opened </span>
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
