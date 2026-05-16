"use client";

import { useState } from "react";
import type { SavedRun } from "@/lib/runs";
import type { Persona } from "@/lib/types";
import { PersonaExpanded } from "./persona-expanded";
import { PersonaAvatar } from "./persona-avatar";

export function PersonaPanel({ run }: { run: SavedRun }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="bg-card border border-hairline rounded-md overflow-hidden">
      {/* Section header */}
      <div className="px-6 py-4 border-b border-hairline">
        <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          customer panel
        </div>
        <div className="font-display text-lg font-semibold text-ink mt-0.5">
          {run.personas.length} simulated customers
        </div>
        <div className="text-xs text-muted mt-1">
          click a row to see their paired inbox journey
        </div>
      </div>

      <ul className="divide-y divide-hairline">
        {run.personas.map((persona) => {
          const runA = run.agentRuns.find(
            (r) => r.personaId === persona.id && r.arm === "A",
          );
          const runB = run.agentRuns.find(
            (r) => r.personaId === persona.id && r.arm === "B",
          );
          if (!runA || !runB) return null;

          const aClick = runA.round2.clicks.some(
            (c) => c.emailId === run.candidateA.id,
          );
          const aBuy = runA.round3.purchases.length > 0;
          const aSpend = runA.round3.totalSpent;

          const bClick = runB.round2.clicks.some(
            (c) => c.emailId === run.candidateB.id,
          );
          const bBuy = runB.round3.purchases.length > 0;
          const bSpend = runB.round3.totalSpent;

          const winner =
            aSpend > bSpend
              ? "A"
              : bSpend > aSpend
                ? "B"
                : aBuy !== bBuy
                  ? aBuy
                    ? "A"
                    : "B"
                  : null;

          const isExpanded = expandedId === persona.id;

          return (
            <li key={persona.id} className="bg-card">
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : persona.id)
                }
                className={`w-full text-left px-6 py-5 hover:bg-paper transition-colors ${
                  isExpanded ? "bg-paper" : ""
                }`}
              >
                <div className="flex items-start gap-6">
                  {/* Avatar — Gemini-generated portrait, falls back to initials */}
                  <PersonaAvatar id={persona.id} name={persona.name} size="lg" />

                  {/* Persona identity column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="font-display text-base font-semibold text-ink">
                        {persona.name}
                      </span>
                      <Chip>{persona.age}</Chip>
                      {persona.stratum &&
                        Object.entries(persona.stratum)
                          .slice(0, 2)
                          .map(([k, v]) => (
                            <Chip key={k} subtle>
                              {v.replace(/_/g, " ")}
                            </Chip>
                          ))}
                    </div>
                    <p
                      className="text-sm text-muted italic leading-relaxed line-clamp-2"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      &ldquo;{persona.shortBio}&rdquo;
                    </p>
                  </div>

                  {/* Arm outcomes — mono chips */}
                  <div className="hidden sm:flex items-start gap-4 flex-shrink-0">
                    <ArmOutcome
                      arm="A"
                      click={aClick}
                      buy={aBuy}
                      spend={aSpend}
                    />
                    <ArmOutcome
                      arm="B"
                      click={bClick}
                      buy={bBuy}
                      spend={bSpend}
                    />
                  </div>

                  {/* Winner */}
                  <div className="w-10 flex-shrink-0 text-right pt-1">
                    {winner ? (
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: "var(--verdict-deep)" }}
                      >
                        → {winner}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-muted">—</span>
                    )}
                  </div>
                </div>
              </button>
              {isExpanded && (
                <PersonaExpanded
                  persona={persona}
                  runA={runA}
                  runB={runB}
                  candidateA={run.candidateA}
                  candidateB={run.candidateB}
                  backgroundEmails={run.backgroundEmails}
                  productsById={run.productsById}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Chip({
  children,
  subtle,
}: {
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
        subtle
          ? "border-hairline text-muted bg-paper"
          : "border-hairline text-ink bg-paper"
      }`}
    >
      {children}
    </span>
  );
}

function ArmOutcome({
  arm,
  click,
  buy,
  spend,
}: {
  arm: "A" | "B";
  click: boolean;
  buy: boolean;
  spend: number;
}) {
  return (
    <div className="text-right min-w-[110px]">
      <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted mb-1">
        [{arm}]
      </div>
      <div className="font-mono text-xs flex items-center justify-end gap-1.5">
        <Marker on={click} label="click" />
        <Marker on={buy} label="buy" />
      </div>
      <div className="font-mono text-sm text-ink font-semibold tabular-nums mt-1">
        ${spend.toFixed(2)}
      </div>
    </div>
  );
}

function Marker({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded-sm border ${
        on
          ? "border-ink bg-ink text-paper"
          : "border-hairline text-muted line-through opacity-50"
      }`}
    >
      {label}
    </span>
  );
}
