// Stratified Verbalized-Sampling persona generation.
//
// Pattern: brand-aware. For each brand we (one-time):
//   1. Discover 3-4 stratification axes for this brand's audience (1 LLM call)
//   2. Generate N=10 distinct personas distributed across strata, each as a
//      first-person profile that can serve as an agent system prompt (1 LLM call)
//   3. Cache to src/lib/fixtures/personas/<brandId>.json (committed to repo)
//
// Defaults: brand-aware axes, no auto-refresh, no DB write. Pure local fixtures.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Persona } from "./types";
import type { BrandAudience } from "./kopi";

const anthropic = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

const PERSONAS_DIR = path.resolve(
  process.cwd(),
  "src/lib/fixtures/personas",
);

// -----------------------------------------------------------------------------
// Step 0 — Abstract the audience to remove brand-specific contamination
// -----------------------------------------------------------------------------
// The kopi audience chunk names the brand, its signature ingredients, and its
// specific solutions ("Mirai Clinical", "Japanese persimmon", "Nonenal"). If
// we feed that to the persona generator, personas get pre-conditioned to know
// about and prefer the brand's solution before they ever read an email —
// massive bias. So first: strip brand-specific terms, keeping only the
// customer-side problem space (demographics, lifestyle, struggles, desires).
//
// They own the problem. The brand owns the solution.

async function abstractAudience(audience: BrandAudience): Promise<string> {
  const userPrompt = `Below is a target-audience description for a marketing brand. Rewrite it as a CUSTOMER-CENTRIC description — focused only on the customer's problem, demographics, lifestyle, values, and shopping behavior.

REMOVE all references to:
- The specific brand name ("${audience.brandName}", any variants, any sub-brand names)
- Specific products, ingredients, or solutions unique to this brand
- Brand origin stories, founders, or marketing positioning
- Any branded terminology, trademarked terms, or proprietary names

KEEP:
- Customer demographics (age range, gender skew, income tier, geography patterns)
- The PROBLEM customers are trying to solve (described in general, non-branded terms)
- Lifestyle, values, life stage
- General shopping behavior (research-driven, deal-seeking, loyalty patterns, etc.)
- General category they shop in (e.g. "personal care", "running gear", "supplements")

Principle: the result should describe customers who HAVE A PROBLEM, not customers who already know about THIS BRAND. A reader of the result should not be able to guess which brand it was written for.

Original audience description:
"""
${audience.audience}

${audience.painPoints ?? ""}

${audience.dreamsOutcomes ?? ""}
"""

Return ONLY the rewritten customer-centric description. No preamble, no headings, no metadata. 300-500 words.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: userPrompt }],
  });
  const textBlock = response.content.find((c) => c.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in abstract-audience response");
  }
  return textBlock.text.trim();
}

// -----------------------------------------------------------------------------
// Step 1 — Axis discovery
// -----------------------------------------------------------------------------

const AxesSchema = z.object({
  axes: z
    .array(
      z.object({
        name: z.string(),
        values: z.array(z.string()).min(2).max(6),
        rationale: z.string(),
      }),
    )
    .min(2)
    .max(4),
});

const axesTool = {
  name: "submit_axes",
  description:
    "Submit 2-4 stratification axes that capture meaningful within-audience variation for this brand's marketing email response.",
  input_schema: {
    type: "object" as const,
    properties: {
      axes: {
        type: "array" as const,
        minItems: 2,
        maxItems: 4,
        items: {
          type: "object" as const,
          properties: {
            name: {
              type: "string" as const,
              description: "Snake_case axis name, e.g., 'age_bracket', 'shopping_style', 'life_stage'",
            },
            values: {
              type: "array" as const,
              minItems: 2,
              maxItems: 6,
              items: { type: "string" as const },
              description: "2-6 distinct categorical values along this axis",
            },
            rationale: {
              type: "string" as const,
              description: "One-line why this axis matters for email response variation in this audience",
            },
          },
          required: ["name", "values", "rationale"],
        },
      },
    },
    required: ["axes"],
  },
};

export type StratAxis = { name: string; values: string[]; rationale: string };

async function discoverAxes(abstractedAudience: string): Promise<StratAxis[]> {
  const userPrompt = `You're designing a stratified-sampling scheme for synthetic personas representing a target customer audience, for a marketing-email A/B test.

Customer-centric audience description (brand-agnostic):
${abstractedAudience}

Pick 2-4 categorical axes that capture the MOST meaningful within-audience variation in how individual customers respond to marketing email. Examples (for context — pick what fits THIS audience):
- age_bracket × shopping_style × life_stage
- income_tier × category_engagement × time_constraint
- problem_awareness_stage × purchase_trigger

IMPORTANT: axis names and values must be brand-agnostic. Use general terms like "shopping_style" not "loyalty_to_<brand>". Use "category_engagement" not "<specific-product>_familiarity".

Each axis should have 2-6 discrete values. The total cells (product of values) should be roughly 12-30 so we can sample ~10 personas to cover the space.

Call submit_axes.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: userPrompt }],
    tools: [axesTool],
    tool_choice: { type: "tool", name: "submit_axes" },
  });
  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("No tool_use in axes response");
  const parsed = AxesSchema.parse(toolUse.input);
  return parsed.axes;
}

// -----------------------------------------------------------------------------
// Step 2 — Stratified persona generation
// -----------------------------------------------------------------------------

const PersonasSchema = z.object({
  personas: z
    .array(
      z.object({
        name: z.string(),
        age: z.number().int().min(18).max(95),
        short_bio: z.string(),
        long_profile: z.string(),
        stratum: z.record(z.string(), z.string()),
      }),
    )
    .min(8)
    .max(20),
});

const personasTool = {
  name: "submit_personas",
  description:
    "Submit a fleet of distinct first-person personas distributed across the stratification axes.",
  input_schema: {
    type: "object" as const,
    properties: {
      personas: {
        type: "array" as const,
        minItems: 8,
        maxItems: 20,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const, description: "First + last name" },
            age: { type: "integer" as const, minimum: 18, maximum: 95 },
            short_bio: { type: "string" as const, description: "One line for UI cards" },
            long_profile: {
              type: "string" as const,
              description:
                "150-220 words, first-person. Cover: who they are (occupation, location, life stage), what they actually care about, how they shop and what makes them open vs skip marketing email, their relationship to this brand's category. Be specific. Avoid marketing clichés. Should be internally consistent and clearly distinct from the other personas in this fleet.",
            },
            stratum: {
              type: "object" as const,
              description: "Map of axis_name -> value for this persona (one entry per axis)",
              additionalProperties: { type: "string" as const },
            },
          },
          required: ["name", "age", "short_bio", "long_profile", "stratum"],
        },
      },
    },
    required: ["personas"],
  },
};

async function generatePersonasWithAxes(
  abstractedAudience: string,
  axes: StratAxis[],
  n: number,
  brandIdForIds: string,
): Promise<Persona[]> {
  const axesRendered = axes
    .map(
      (a) =>
        `- ${a.name}: [${a.values.join(", ")}]\n  (why it varies email response: ${a.rationale})`,
    )
    .join("\n");

  const userPrompt = `You're generating exactly ${n} distinct synthetic customer personas for a marketing-email A/B test.

These personas will independently react to a set of marketing emails. Some of those emails may be from a brand they've never heard of. The personas must approach the inbox WITHOUT prior knowledge of any specific brand or its specific solutions — that's the whole point of the test. They own the problem; brands own the solution.

Customer-centric audience description (brand-agnostic):
${abstractedAudience}

Stratification axes (each persona must specify a value for every axis):
${axesRendered}

Generate ${n} personas that:
- TOGETHER cover the stratification space — weight toward more-common cells but include a few edges
- Are NOT minor variations of the same archetype — they should feel like ${n} different real people
- Each is a plausible member of the customer audience described above
- Each long_profile is written in first-person, includes how this specific person shops via email (what triggers their interest, what triggers their BS detector), and grounds the persona in the GENERAL problem/category space (not specific solutions)

═══════════════════════════════════════════════════════════════════════
FORBIDDEN in every persona profile — these are sources of measurement bias:
═══════════════════════════════════════════════════════════════════════
✗ Do NOT name any specific brand (any brand) in the profile. Personas may say
  "I'm loyal to a few brands I trust" but NEVER name one.
✗ Do NOT name any specific product, ingredient, or compound that would suggest
  the persona already knows about a particular brand's solution. Example:
  do NOT mention "persimmon", "Nonenal", "Erato SPF", or any other branded
  scientific or product term.
✗ Do NOT prime the persona as an existing customer of any specific brand.
  ("I've been buying X for years" is forbidden if X is a real brand.)
✗ Do NOT have personas already aware of specific solutions to their problem.
  ("I've been looking for an SPF that doesn't leave white cast" is fine.
   "I've been waiting for a mineral SPF with persimmon extract" is FORBIDDEN.)

The principle: personas describe their PROBLEM and SHOPPING BEHAVIOR in general
terms. Whatever specific solutions/ingredients/brand-names appear in the emails
they read are encountered for the FIRST TIME during the test — that's how we
measure email effectiveness honestly.

═══════════════════════════════════════════════════════════════════════

Aim for genuine personality and life-context differences — what makes one person
opening their inbox different from another isn't just demographics, it's mood,
trust patterns, decision-making style, what triggers their BS-detector.

Call submit_personas.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 16000,
    messages: [{ role: "user", content: userPrompt }],
    tools: [personasTool],
    tool_choice: { type: "tool", name: "submit_personas" },
  });
  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use in personas response: ${JSON.stringify(response.content).slice(0, 200)}`);
  }
  const parsed = PersonasSchema.parse(toolUse.input);

  return parsed.personas.map((p, i) => ({
    id: `p_${brandIdForIds.slice(0, 8)}_${String(i).padStart(2, "0")}_${p.name.toLowerCase().replace(/\s+/g, "_")}`,
    name: p.name,
    age: p.age,
    shortBio: p.short_bio,
    longProfile: p.long_profile,
    stratum: p.stratum,
  }));
}

// -----------------------------------------------------------------------------
// Step 3 — Cache layer (local JSON, committed)
// -----------------------------------------------------------------------------

type PersonasFixture = {
  brandId: string;
  brandName: string;
  generatedAt: string;
  abstractedAudience: string; // brand-agnostic customer description (no brand/product leak)
  axes: StratAxis[];
  personas: Persona[];
};

function fixturePath(brandId: string): string {
  return path.join(PERSONAS_DIR, `${brandId}.json`);
}

function loadFixture(brandId: string): PersonasFixture | null {
  const fp = fixturePath(brandId);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8")) as PersonasFixture;
  } catch {
    return null;
  }
}

function saveFixture(fixture: PersonasFixture): void {
  fs.mkdirSync(PERSONAS_DIR, { recursive: true });
  fs.writeFileSync(fixturePath(fixture.brandId), JSON.stringify(fixture, null, 2));
}

/** Load cached personas for this brand, or generate + cache if missing. */
export async function loadOrGeneratePersonas(
  audience: BrandAudience,
  n = 10,
  opts: { force?: boolean; verbose?: boolean } = {},
): Promise<{ personas: Persona[]; axes: StratAxis[]; cached: boolean }> {
  if (!opts.force) {
    const cached = loadFixture(audience.brandId);
    if (cached && cached.personas.length >= n) {
      return { personas: cached.personas.slice(0, n), axes: cached.axes, cached: true };
    }
  }
  if (opts.verbose)
    console.log(`  Generating ${n} personas for ${audience.brandName}...`);

  // 0) Abstract the audience to strip brand-specific leakage
  if (opts.verbose) console.log("  → Abstracting audience to remove brand/product references...");
  const abstractedAudience = await abstractAudience(audience);

  // 1) Discover brand-agnostic stratification axes
  const axes = await discoverAxes(abstractedAudience);
  if (opts.verbose) {
    console.log(`  → Discovered ${axes.length} axes:`);
    for (const a of axes) console.log(`      - ${a.name}: [${a.values.join(", ")}]`);
  }

  // 2) Generate personas from the abstracted audience with explicit anti-leak instructions
  const personas = await generatePersonasWithAxes(
    abstractedAudience,
    axes,
    n,
    audience.brandId,
  );

  // 3) Safety check — scan for known brand-specific terms and warn
  if (opts.verbose) {
    const forbidden = extractForbiddenTerms(audience);
    const leaks: string[] = [];
    for (const p of personas) {
      const hits = forbidden.filter((t) =>
        p.longProfile.toLowerCase().includes(t.toLowerCase()),
      );
      if (hits.length > 0) leaks.push(`    ⚠ ${p.name}: ${hits.join(", ")}`);
    }
    if (leaks.length > 0) {
      console.log(`  → WARNING: ${leaks.length}/${personas.length} personas still leak brand terms:`);
      for (const l of leaks) console.log(l);
    } else {
      console.log(`  → ✓ Zero brand-term leaks across ${personas.length} personas`);
    }
  }

  saveFixture({
    brandId: audience.brandId,
    brandName: audience.brandName,
    generatedAt: new Date().toISOString(),
    abstractedAudience,
    axes,
    personas,
  });
  return { personas, axes, cached: false };
}

/** Heuristic: extract brand/product-specific terms from the raw audience text. */
function extractForbiddenTerms(audience: BrandAudience): string[] {
  const terms = new Set<string>();
  // Brand name and its tokens
  terms.add(audience.brandName);
  for (const tok of audience.brandName.split(/\s+/)) {
    if (tok.length > 3) terms.add(tok);
  }
  // Capitalized multi-word phrases in audience text — likely product/ingredient names
  const allText = [
    audience.audience,
    audience.painPoints ?? "",
    audience.dreamsOutcomes ?? "",
  ].join(" ");
  const capPhrases =
    allText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g) ?? [];
  for (const phrase of capPhrases) {
    // Filter out common words at sentence starts
    if (phrase.length > 5 && !COMMON_CAPS.has(phrase.split(/\s+/)[0])) {
      terms.add(phrase);
    }
  }
  // Specific known leakers
  for (const t of allText.matchAll(/'([^']{3,30})'/g)) {
    terms.add(t[1]);
  }
  return [...terms];
}

const COMMON_CAPS = new Set([
  "The",
  "They",
  "Their",
  "This",
  "That",
  "These",
  "Those",
  "Customers",
  "Their",
  "It",
  "If",
  "When",
  "While",
  "Based",
  "Given",
  "Despite",
  "However",
  "Beyond",
  "From",
  "For",
  "With",
  "After",
  "Before",
]);
