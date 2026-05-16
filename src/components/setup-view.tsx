// Setup view — entry of the demo flow.
// Real fixture data: 3 brands, real emails with real subjects, 9 real competitors.
// User picks brand + email A + email B → click Run → transitions to sim viz.

"use client";

import { useState } from "react";
import { DEMO_BRANDS, COMPETITOR_BRANDS, getDemoBrand } from "@/lib/fixtures/demo-brands";

type Props = {
  defaultBrandId?: string;
  onRun: (params: {
    brandId: string;
    emailAId: string;
    emailBId: string;
  }) => void;
};

export function SetupView({ defaultBrandId, onRun }: Props) {
  const [brandId, setBrandId] = useState<string>(
    defaultBrandId ?? DEMO_BRANDS[0].id,
  );
  const brand = getDemoBrand(brandId) ?? DEMO_BRANDS[0];
  const [emailAId, setEmailAId] = useState<string>(brand.defaultA);
  const [emailBId, setEmailBId] = useState<string>(brand.defaultB);

  const onBrandChange = (id: string) => {
    setBrandId(id);
    const next = getDemoBrand(id);
    if (next) {
      setEmailAId(next.defaultA);
      setEmailBId(next.defaultB);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Wordmark + run-context strip */}
      <header className="border-b border-hairline bg-card">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none">
            INBOX WARS
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            setup
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        {/* Title block */}
        <div className="text-center space-y-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            agentic a/b testing for marketing email
          </div>
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink">
            Which email should you send?
          </h1>
          <p className="text-muted text-base max-w-xl mx-auto leading-relaxed">
            We&rsquo;ll drop your two candidates into a 100-email inbox alongside real
            competitor emails, then run 10 LLM persona agents grounded in your
            actual customer psychographics. See which one wins before you hit send.
          </p>
        </div>

        {/* Step 1 — Brand selector */}
        <Step number="01" label="Pick a brand">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DEMO_BRANDS.map((b) => {
              const selected = b.id === brandId;
              return (
                <button
                  key={b.id}
                  onClick={() => onBrandChange(b.id)}
                  className={[
                    "text-left rounded-md border p-4 transition-all",
                    selected
                      ? "border-ink bg-ink text-paper"
                      : "border-hairline bg-card text-ink hover:border-muted",
                  ].join(" ")}
                >
                  <div className="font-display text-base font-semibold mb-1">
                    {b.name}
                  </div>
                  <div
                    className={[
                      "text-xs leading-relaxed",
                      selected ? "text-paper/70" : "text-muted",
                    ].join(" ")}
                  >
                    {b.blurb}
                  </div>
                  <div
                    className={[
                      "mt-3 font-mono text-[10px] uppercase tracking-wider",
                      selected ? "text-paper/60" : "text-muted/70",
                    ].join(" ")}
                  >
                    {b.emails.length} authored emails · {b.category}
                  </div>
                </button>
              );
            })}
          </div>
        </Step>

        {/* Step 2 — Pick A vs B */}
        <Step number="02" label="Choose two emails to test">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EmailPicker
              arm="A"
              brand={brand}
              value={emailAId}
              onChange={setEmailAId}
              other={emailBId}
            />
            <EmailPicker
              arm="B"
              brand={brand}
              value={emailBId}
              onChange={setEmailBId}
              other={emailAId}
            />
          </div>
        </Step>

        {/* Step 3 — Competitor preview */}
        <Step number="03" label="In a 100-email inbox alongside">
          <div className="rounded-md border border-hairline bg-card px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {COMPETITOR_BRANDS.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-paper border border-hairline font-mono text-[11px] text-ink"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-muted/40" />
                  {name}
                </span>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted">
              Real promotional emails from these brands, scraped from public inboxes
              — same 99 background emails across both arms.
            </div>
          </div>
        </Step>

        {/* Run button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={() =>
              onRun({ brandId, emailAId, emailBId })
            }
            disabled={!emailAId || !emailBId || emailAId === emailBId}
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-ink text-paper rounded-md font-display font-semibold text-lg hover:bg-ink/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Simulation
            <span className="font-mono text-sm opacity-70 group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </button>
        </div>

        <div className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
          10 persona agents · paired a/b design · claude sonnet 4.6
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  label,
  children,
}: {
  number: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          step {number}
        </span>
        <h2 className="font-display text-lg font-semibold text-ink">{label}</h2>
      </div>
      {children}
    </div>
  );
}

function EmailPicker({
  arm,
  brand,
  value,
  onChange,
  other,
}: {
  arm: "A" | "B";
  brand: ReturnType<typeof getDemoBrand>;
  value: string;
  onChange: (id: string) => void;
  other: string;
}) {
  if (!brand) return null;
  return (
    <div className="rounded-md border border-hairline bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-hairline bg-paper flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink">
          [Candidate {arm}]
        </span>
        <span className="font-mono text-[10px] text-muted">{brand.name}</span>
      </div>
      <ul className="divide-y divide-hairline">
        {brand.emails.map((e) => {
          const isSelected = e.chatId === value;
          const isOther = e.chatId === other;
          return (
            <li key={e.chatId}>
              <button
                onClick={() => onChange(e.chatId)}
                disabled={isOther}
                className={[
                  "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors",
                  isSelected
                    ? "bg-ink text-paper"
                    : isOther
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-paper",
                ].join(" ")}
              >
                <span
                  className={[
                    "w-3.5 h-3.5 rounded-full border shrink-0",
                    isSelected
                      ? "bg-paper border-paper"
                      : "border-muted/40",
                  ].join(" ")}
                />
                <span className="text-sm flex-1 truncate">{e.subject}</span>
                {isOther && (
                  <span className="font-mono text-[9px] uppercase tracking-wider opacity-60">
                    in use
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
