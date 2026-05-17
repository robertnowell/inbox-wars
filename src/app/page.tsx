// Landing page: top bar with Run a Simulation CTA, demo video hero,
// then prose explaining what Inbox Wars is. Setup itself lives at /simulation.

export const dynamic = "force-dynamic";

export default function Landing() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopBar />
      <Hero />
      <Concept />
      <Footer />
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-card/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between">
        <a
          href="/"
          className="font-display text-2xl font-extrabold tracking-tight text-ink leading-none hover:opacity-80"
        >
          INBOX WARS
        </a>
        <a
          href="/simulation"
          className="inline-flex items-center gap-2 px-5 py-2 bg-ink text-paper rounded-md font-display font-semibold text-sm hover:bg-ink/90 transition-colors"
        >
          Run a Simulation
          <span className="font-mono opacity-60">→</span>
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-8 pt-16 pb-12 space-y-8">
      <div className="text-center space-y-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
          Agentic A/B testing for marketing email
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-extrabold tracking-tight text-ink leading-[1.05]">
          Don&apos;t A/B test on your customers.
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          Pit two candidate emails against a fleet of 100 LLM persona agents in
          a realistic competitor inbox. Get open rate, click rate, and
          simulated revenue — in minutes, before you risk a send.
        </p>
      </div>

      {/* Demo video — drop the final cut at /public/demo.mp4, or replace
          this <video> with an <iframe> for YouTube / Loom. */}
      <div className="rounded-lg border border-hairline bg-card overflow-hidden shadow-sm">
        <div className="aspect-video bg-paper">
          <video
            controls
            playsInline
            preload="metadata"
            poster="/demo-poster.png"
            className="w-full h-full object-cover"
          >
            <source src="/demo.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="px-4 py-2 border-t border-hairline flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            demo · 3:00
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            mirai · skincare · paired A/B
          </span>
        </div>
      </div>

      <div className="flex justify-center pt-2">
        <a
          href="/simulation"
          className="inline-flex items-center gap-3 px-10 py-4 bg-ink text-paper rounded-md font-display font-semibold text-lg hover:bg-ink/90 transition-colors"
        >
          Run a Simulation
          <span className="font-mono opacity-60">→</span>
        </a>
      </div>
    </section>
  );
}

function Concept() {
  return (
    <section className="max-w-5xl mx-auto px-8 py-16 space-y-20">
      {/* The problem */}
      <Block
        eyebrow="The problem"
        heading="A/B testing real emails is itself a tax."
      >
        <p>
          Email marketing is a critical channel for e-commerce, and A/B
          testing subject lines and copy is standard practice. But if Variant
          A is 10× better than Variant B and you split your list 50/50, you
          just torched half your potential revenue sending the loser.
        </p>
        <p>
          Don&apos;t leave money on the table.{" "}
          <strong className="text-ink">
            Get A/B test results in minutes
          </strong>{" "}
          for your marketing emails — on a fleet of agents grounded in your
          actual customers — before you ever press send.
        </p>
      </Block>

      {/* How it works */}
      <Block eyebrow="How it works" heading="100 agents. One inbox. Three rounds.">
        <p>
          You pick two candidate emails for a brand. We assemble a{" "}
          <strong className="text-ink">100-email inbox</strong> — your
          candidate plus 99 real emails from competitor and adjacent brands.
          Then we run 100 autonomous LLM persona agents, each one grounded in
          your target customer psychographics.
        </p>
        <Steps />
        <p className="text-sm text-muted">
          The output: open rate, click rate, and simulated revenue for A vs B.
        </p>
      </Block>

      {/* Why agentic */}
      <Block
        eyebrow="Why agentic"
        heading="Independent state. Real budgets. Self-narrated reasoning."
      >
        <p>
          Each persona is an autonomous agent, not a prompt to a single judge.
          Every agent has its own attention budget, click budget, and{" "}
          <strong className="text-ink">$100 of weekly spend</strong>. Every
          agent narrates its own rationale for what it opened, clicked, and
          bought.
        </p>
        <p>
          You don&apos;t get an opinion. You get a{" "}
          <strong className="text-ink">distribution</strong> — top decile,
          bottom decile, edge cases — across a population that behaves like
          your real list.
        </p>
      </Block>
    </section>
  );
}

function Block({
  eyebrow,
  heading,
  children,
}: {
  eyebrow: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid md:grid-cols-[180px_1fr] gap-8 md:gap-12 items-start">
      <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted md:pt-2">
        {eyebrow}
      </div>
      <div className="space-y-5">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-ink leading-tight">
          {heading}
        </h2>
        <div className="space-y-4 text-base md:text-lg text-ink/80 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

function Steps() {
  const steps = [
    { n: "01", label: "Open", detail: "Up to 20 emails per agent" },
    { n: "02", label: "Click", detail: "Up to 5 emails per agent" },
    { n: "03", label: "Purchase", detail: "Up to 2 products per agent" },
  ];
  return (
    <div className="grid sm:grid-cols-3 gap-3 py-2">
      {steps.map((s) => (
        <div
          key={s.n}
          className="rounded-md border border-hairline bg-card p-4 space-y-1"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {s.n}
          </div>
          <div className="font-display text-xl font-semibold text-ink">
            {s.label}
          </div>
          <div className="text-sm text-muted">{s.detail}</div>
        </div>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-8 py-12 border-t border-hairline">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
          inbox wars · agentic A/B simulator · claude sonnet 4.6
        </div>
        <a
          href="/simulation"
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink hover:opacity-70"
        >
          Run a Simulation →
        </a>
      </div>
    </footer>
  );
}
