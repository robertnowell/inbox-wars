# Inbox Wars

**Agentic Simulator for A/B Testing Marketing Emails**

> You're an e-com company — which marketing email should you send? Simulate 100 agents reading a realistic inbox of competitor emails to find out.

## What this is

A multi-agent A/B testing tool for marketing email. Pick two candidate emails. We run them past a fleet of 50 LLM persona agents (each one seeing both versions in a paired design) inside a realistic 100-email inbox of competitor and adjacent brand emails. Each agent independently decides what to open, what to click, and what to buy. Output: open rate, click rate, simulated revenue per email, plus per-persona drill-down with rationales.

## Why

A/B testing marketing emails on real audiences puts money at risk. If email A converts 10× better than email B and you split traffic 50/50, you've burned half your potential revenue on the loser. Existing pre-send tools (Persado, Phrasee) are predictive models trained on historical data — not actual agents reading your email in a real inbox. This is the latter.

## How it works

For each candidate email (A and B):

1. **Assemble the inbox**: the candidate + 99 emails from competitor and adjacent brands (pre-scraped fixtures).
2. **Spawn 50 persona agents**, each grounded in the brand's customer psychographics (extracted from the brand's site, editable by the user).
3. **Each agent runs 3 rounds**:
   - **Open** — sees all 100 emails (subject + preheader + sender), picks 20 to open
   - **Click** — sees full body + screenshot of the 20 opened emails, picks 5 to click through
   - **Buy** — sees landing pages of the 5 clicked, allocates up to $100 across what they want to buy (or nothing)
4. **Paired design**: the same 50 personas process both Email A and Email B (different test slot, identical 99 background emails). 50 personas × 2 arms = 100 paired agent sessions.

Aggregate per email: open count, click count, total simulated revenue. Compare A vs B.

## Why agentic

Each persona is an autonomous agent with independent state, budget tracking, decision-making, and self-narrated rationales — operating in parallel in a shared simulated environment. The ranking emerges from the fleet's collective behavior, not from a single judge prompt.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Anthropic Claude Sonnet 4.6** for agent reasoning (with prompt caching on the persona/system prefix)
- **Tailwind CSS v4** + shadcn/ui for the demo UI
- **Zod** for structured-output schemas

## Demo flow

1. Pick a brand from the fixture set (Aesop, Glossier, Allbirds, etc.)
2. Review the auto-extracted customer persona (edit if you want)
3. Paste / upload your two candidate emails (subject + preheader + body)
4. Hit **Run simulation** → ~3–5 minutes (50 personas × 2 arms × 3 rounds, parallel)
5. **Results**:
   - Headline: open rate / click rate / revenue for A vs B
   - Per-round breakdown
   - Click any persona avatar → see *their* inbox, *their* picks, *their* one-line reason per choice

## Getting started

```bash
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
pnpm dev
```

## Status

Hackathon project for **Internet of Agents Build Day** (2026-05-16).

## Architecture decisions of note

- **Paired comparison, not independent runs**: same 50 personas see both A and B → much higher statistical power per agent
- **Budgeted forced-choice at every round** (open 20, click 5, $100 budget) instead of unconstrained free-form simulation — gives clean ordinal ranking data, avoids the persona-drift and non-termination biases that hit prompt-only LLMs in long agent sessions (cf. Lu et al. 2026, arxiv 2503.20749)
- **Hybrid email rendering** to agents: text-only in round 1 (the inbox-glance round, 100 emails — cost matters), text + screenshot in round 2 (full read), landing-page screenshot in round 3
- **Single Claude Sonnet 4.6** for v1 (panel-of-judges adds 3× cost for marginal gain at this scale)
- **Position-bias mitigation**: per-agent shuffle of the candidate list at every round
- **No real checkout**: simulated purchase decisions only — agent's revenue is what they *say* they'd spend, not real transactions
