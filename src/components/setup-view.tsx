// Setup view — entry of the demo flow.
// Real fixture data with REAL email screenshots. Dropdown + chip controls.

"use client";

import { useState } from "react";
import {
  DEMO_BRANDS,
  AVAILABLE_COMPETITORS,
  DEFAULT_COMPETITORS,
  getDemoBrand,
  type DemoEmailOption,
} from "@/lib/fixtures/demo-brands";

type Props = {
  defaultBrandId?: string;
  onRun: (params: {
    brandId: string;
    emailAId: string;
    emailBId: string;
    competitors: string[];
  }) => void;
};

export function SetupView({ defaultBrandId, onRun }: Props) {
  const [brandId, setBrandId] = useState(defaultBrandId ?? DEMO_BRANDS[0].id);
  const brand = getDemoBrand(brandId) ?? DEMO_BRANDS[0];
  const [emailAId, setEmailAId] = useState(brand.defaultA);
  const [emailBId, setEmailBId] = useState(brand.defaultB);
  const [competitors, setCompetitors] = useState<string[]>(DEFAULT_COMPETITORS);

  const emailA = brand.emails.find((e) => e.chatId === emailAId);
  const emailB = brand.emails.find((e) => e.chatId === emailBId);

  const onBrandChange = (id: string) => {
    setBrandId(id);
    const next = getDemoBrand(id);
    if (next) {
      setEmailAId(next.defaultA);
      setEmailBId(next.defaultB);
    }
  };

  const canRun = emailAId && emailBId && emailAId !== emailBId && competitors.length >= 3;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-hairline bg-card">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none">
            INBOX WARS
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            setup
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-16 space-y-12">
        <h1 className="font-display text-5xl font-extrabold tracking-tight text-ink text-center">
          Which email should you send?
        </h1>

        {/* Brand */}
        <Row label="Brand">
          <Dropdown
            value={brandId}
            onChange={onBrandChange}
            options={DEMO_BRANDS.map((b) => ({
              value: b.id,
              label: b.name,
              detail: b.blurb,
            }))}
          />
        </Row>

        {/* A vs B */}
        <Row label="A vs B">
          <div className="grid grid-cols-2 gap-4">
            <EmailCandidate
              arm="A"
              selected={emailAId}
              onChange={setEmailAId}
              emails={brand.emails}
              other={emailBId}
              preview={emailA}
            />
            <EmailCandidate
              arm="B"
              selected={emailBId}
              onChange={setEmailBId}
              emails={brand.emails}
              other={emailAId}
              preview={emailB}
            />
          </div>
        </Row>

        {/* Brand archetype — the iconic customer all 10 simulated personas
            are sampled from. Concise, evocative, lives just above the inbox. */}
        <Row label="Customer">
          <ArchetypeCard archetype={brand.archetype} />
        </Row>

        {/* Inbox / Competitors */}
        <Row label="Inbox">
          <InboxBuilder
            competitors={competitors}
            setCompetitors={setCompetitors}
            brand={brand}
            emailA={emailA}
            emailB={emailB}
          />
        </Row>

        <div className="flex justify-center pt-2">
          <button
            onClick={() =>
              onRun({ brandId, emailAId, emailBId, competitors })
            }
            disabled={!canRun}
            className="inline-flex items-center gap-3 px-10 py-4 bg-ink text-paper rounded-md font-display font-semibold text-lg hover:bg-ink/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run Simulation
            <span className="font-mono opacity-60">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Row ───────────────────────── */

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-[120px_1fr] gap-8 items-start">
      <div className="pt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted text-right">
        {label}
      </div>
      <div>{children}</div>
    </section>
  );
}

/* ─────────────────────── Dropdown ────────────────────── */

function Dropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; detail?: string }[];
}) {
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-card border border-hairline rounded-md px-4 py-3 pr-10 font-display text-base font-semibold text-ink hover:border-muted cursor-pointer focus:outline-none focus:border-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.detail ? ` — ${o.detail}` : ""}
          </option>
        ))}
      </select>
      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-muted pointer-events-none">
        ▾
      </span>
      {current?.detail && (
        <div className="mt-1.5 text-xs text-muted px-1">{current.detail}</div>
      )}
    </div>
  );
}

/* ────────────────────── ArchetypeCard ─────────────────── */

function ArchetypeCard({
  archetype,
}: {
  archetype: { title: string; summary: string; imageUrl: string };
}) {
  return (
    <div className="rounded-md border border-hairline bg-card p-4 flex items-start gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={archetype.imageUrl}
        alt={archetype.title}
        className="w-20 h-20 rounded-full object-cover ring-1 ring-hairline shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-1">
          archetype
        </div>
        <div className="font-display text-lg font-semibold text-ink leading-tight">
          {archetype.title}
        </div>
        <p
          className="mt-2 text-sm text-ink italic leading-relaxed"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          &ldquo;{archetype.summary}&rdquo;
        </p>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted">
          10 distinct customers will be sampled from this archetype for the test
        </div>
      </div>
    </div>
  );
}

/* ────────────────────── EmailCandidate ───────────────── */

function EmailCandidate({
  arm,
  selected,
  onChange,
  emails,
  other,
  preview,
}: {
  arm: "A" | "B";
  selected: string;
  onChange: (id: string) => void;
  emails: DemoEmailOption[];
  other: string;
  preview?: DemoEmailOption;
}) {
  return (
    <div className="rounded-md border border-hairline bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-hairline bg-paper flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink">
          [{arm}]
        </span>
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-transparent border-0 font-mono text-xs text-ink cursor-pointer focus:outline-none pr-4"
        >
          {emails.map((e) => (
            <option key={e.chatId} value={e.chatId} disabled={e.chatId === other}>
              {e.subject}
            </option>
          ))}
        </select>
      </div>
      <div className="p-4">
        <div className="font-display text-sm font-semibold text-ink leading-snug">
          {preview?.subject}
        </div>
        <div className="text-xs text-muted mt-1 line-clamp-2 leading-snug">
          {preview?.preheader}
        </div>
        {preview?.screenshotUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={preview.screenshotUrl}
            alt={preview.subject}
            className="mt-3 w-full max-h-80 object-cover object-top rounded-sm border border-hairline"
          />
        ) : (
          <div className="mt-3 h-32 rounded-sm border border-hairline bg-paper" />
        )}
      </div>
    </div>
  );
}

/* ─────────────────── InboxBuilder (chips + preview) ──────────────── */

function InboxBuilder({
  competitors,
  setCompetitors,
  brand,
  emailA,
  emailB,
}: {
  competitors: string[];
  setCompetitors: (next: string[]) => void;
  brand: { name: string };
  emailA?: DemoEmailOption;
  emailB?: DemoEmailOption;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const available = AVAILABLE_COMPETITORS.filter(
    (c) => !competitors.includes(c),
  );

  const remove = (c: string) =>
    setCompetitors(competitors.filter((x) => x !== c));
  const add = (c: string) => {
    setCompetitors([...competitors, c]);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Chip row */}
      <div className="flex flex-wrap items-center gap-2">
        {competitors.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-card border border-hairline font-mono text-[11px] text-ink"
          >
            {c}
            <button
              onClick={() => remove(c)}
              className="text-muted hover:text-ink text-sm leading-none -mr-0.5"
              aria-label={`Remove ${c}`}
            >
              ×
            </button>
          </span>
        ))}
        {available.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm border border-dashed border-muted/50 font-mono text-[11px] text-muted hover:text-ink hover:border-ink/40"
            >
              + add brand
            </button>
            {pickerOpen && (
              <div className="absolute z-10 mt-1 bg-card border border-hairline rounded-sm shadow-lg overflow-hidden min-w-[180px]">
                {available.map((c) => (
                  <button
                    key={c}
                    onClick={() => add(c)}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-paper font-mono text-ink"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <span className="ml-auto font-mono text-[10px] text-muted tabular-nums">
          {competitors.length} competitors · 100-email inbox
        </span>
      </div>

      {/* Inbox preview */}
      <InboxPreview
        brand={brand}
        emailA={emailA}
        emailB={emailB}
        competitors={competitors}
      />
    </div>
  );
}

function InboxPreview({
  brand,
  emailA,
  emailB,
  competitors,
}: {
  brand: { name: string };
  emailA?: DemoEmailOption;
  emailB?: DemoEmailOption;
  competitors: string[];
}) {
  // Build a synthetic preview of the first ~7 rows of a 100-email inbox.
  // Test emails get a star; competitor rows use generic preheader copy.
  const rows: Array<{ sender: string; subject: string; preview: string; star?: "A" | "B" }> = [];
  if (emailA)
    rows.push({
      sender: brand.name,
      subject: emailA.subject,
      preview: emailA.preheader,
      star: "A",
    });
  if (emailB)
    rows.push({
      sender: brand.name,
      subject: emailB.subject,
      preview: emailB.preheader,
      star: "B",
    });
  const placeholders: Record<string, { subject: string; preview: string }> = {
    Rhode: { subject: "ask rhode: Sportwear", preview: "what should I use for hydrocolloid patches?" },
    Versed: { subject: "A 'Customer for life' SPF", preview: "Lightweight, no white cast, no breakouts." },
    "Tower 28 Beauty": { subject: "NEW! Lip plumper made for sensitive skin", preview: "All plump, no pain." },
    Nécessaire: { subject: "NEW! The Hand Wash + The Hand Lotion", preview: "Introducing Skincare for Hands." },
    "Salt & Stone": { subject: "15% off — anything you want", preview: "Pick two and save." },
    Tracksmith: { subject: "Match Your Top to the Tempo", preview: "Warmer days incoming, gear up." },
    Glossier: { subject: "Our community's must-have products", preview: "Fall in love with them today." },
    Lumin: { subject: "More Routine, Less Guesswork", preview: "Bundles that actually make sense." },
    Olipop: { subject: "Back For Good: Blackberry Vanilla", preview: "Shop this fan favorite." },
  };
  for (const c of competitors.slice(0, 5)) {
    const p = placeholders[c] ?? { subject: "Promotional email", preview: "Limited time offer this week" };
    rows.push({ sender: c, subject: p.subject, preview: p.preview });
  }
  const remaining = 100 - rows.length;

  return (
    <div className="rounded-md border border-hairline bg-card overflow-hidden">
      <div className="px-4 py-2 border-b border-hairline bg-paper flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-red-400/60" />
        <span className="w-2 h-2 rounded-full bg-yellow-400/60" />
        <span className="w-2 h-2 rounded-full bg-green-400/60" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted">
          gmail · promotions
        </span>
      </div>
      <ul className="divide-y divide-hairline text-sm">
        {rows.map((r, i) => (
          <li
            key={i}
            className={[
              "px-4 py-2.5 flex items-center gap-3",
              r.star ? "bg-paper/80" : "",
            ].join(" ")}
          >
            <span
              className={[
                "w-4 inline-flex justify-center font-mono text-xs",
                r.star ? "text-ink" : "text-transparent",
              ].join(" ")}
            >
              {r.star ? "★" : "·"}
            </span>
            <span className="w-32 truncate font-semibold text-ink">{r.sender}</span>
            <span className="flex-1 min-w-0 truncate text-ink">
              <span className="font-medium">{r.subject}</span>
              <span className="text-muted"> — {r.preview}</span>
            </span>
            {r.star && (
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink shrink-0">
                [{r.star}]
              </span>
            )}
          </li>
        ))}
        <li className="px-4 py-2 text-xs text-muted text-center">
          + {remaining} more emails
        </li>
      </ul>
    </div>
  );
}
