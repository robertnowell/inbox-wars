// Agent rounds: open / click / buy.
// Each round is one Anthropic call with a forced-tool-use structured output.
// Persona system prompt is cached across rounds (5-min ephemeral cache).

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type {
  Persona,
  Email,
  Product,
  OpenDecision,
  ClickDecision,
  PurchaseDecision,
} from "./types";

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

// -----------------------------------------------------------------------------
// Persona system prompt — cached across the 3 rounds for the same persona
// -----------------------------------------------------------------------------

export function buildSystemPrompt(persona: Persona): string {
  // Persona may be either a named individual (age > 0) or an audience-level profile
  // (age = 0, from real brand psychographics). Frame slightly differently for each
  // but always ground the agent in the longProfile text.
  const isAudienceLevel = persona.age === 0;
  const intro = isAudienceLevel
    ? `You are simulating a representative customer from the target audience described below. Stay strictly in character. Use first-person ("I would..."). Make decisions a real member of this audience would actually make — not what marketers hope for. Most weeks, real people don't buy anything from email, and that's a perfectly valid outcome.`
    : `You are simulating one specific real-feeling individual for a marketing email A/B test. Stay strictly in character. Use first-person. Make decisions this person would actually make — not what marketers hope for. Most weeks, real people don't buy anything from email, and that's a perfectly valid outcome.`;

  const identityBlock = isAudienceLevel
    ? `You are ${persona.name}.`
    : `Your profile:\nName: ${persona.name}\nAge: ${persona.age}`;

  // SKEPTICAL_PERSONAS=1 adds COMPARATIVE-discrimination priors.
  // Goal: force the agent to rank-order emails based on what would compel
  // THIS specific persona most, instead of clicking everything that looks vaguely
  // good. We're NOT trying to suppress clicks — we're trying to make clicks
  // discriminate between options. Each round is a comparative judgment: of what's
  // here, which speaks to ME specifically right now?
  const skepticalAddendum =
    process.env.SKEPTICAL_PERSONAS === "1"
      ? `

HOW TO MAKE THESE DECISIONS — comparative, not absolute:

Your job is to pick the BEST of what's in front of you, not to decide whether each thing individually deserves engagement. You have limited attention; you're rank-ordering the options based on what would speak to YOU SPECIFICALLY — your profile, your current concerns, your purchase history, what you've been thinking about lately.

When you read an email, ask: "Compared to the others I just saw, which of these 1-2 is most relevant TO ME RIGHT NOW?" Pick those. Not all of them.

PATTERN FATIGUE — you are NOT a marketer; you're a real human who's seen ten thousand promo emails. The following move people LESS, not more, because they signal generic blast rather than thought:
• Hollow urgency phrasing ("LAST CHANCE", "24h ONLY", "Don't miss out") without a concrete reason WHY this matters TO YOU
• Vague "FREE" offers (free product, free gift, free wipes) — your default reaction is "what's the catch?" not "great!"
• ALL CAPS subjects + multiple 🚨 emoji — reads as desperate, not exciting
• "Risk-Free", "Money-Back Guarantee" — table stakes for a real brand, not a differentiator

What MOVES you more (rank these higher):
• A pain point, question, or symptom you've actually experienced — named specifically (not "feel better!" but "Why does X happen?")
• A specific percentage discount on something concrete (15% off sitewide > vague "free gift")
• A new product launch in a category you've been researching
• Editorial / informational content that teaches you something
• Personalization that's clearly EARNED (e.g., references your purchase history or stated interest), not just inserted ({first_name})

You will pick some emails to click in most rounds — the question is WHICH ones, based on which speak to YOUR specific situation more than the alternatives.`
      : "";

  return `${intro}

${identityBlock}

${persona.longProfile}

When choosing what to open, click, or buy, weigh: does this match what I actually care about right now? Am I in the mood / season / financial spot for this? Have I bought from this brand before? Does the subject sound generic ("Last chance!") or specific ("New mineral SPF in matte")?

Be selective. Picking nothing is a valid answer at every stage.${skepticalAddendum}`;
}

// -----------------------------------------------------------------------------
// Round 1 — Open
// -----------------------------------------------------------------------------

const OpenOutputSchema = z.object({
  opens: z
    .array(z.object({ email_id: z.string(), reason: z.string() }))
    .max(20),
});

const openTool = {
  name: "submit_opens",
  description:
    "Submit the emails you'd actually open right now. At most 20. Submit fewer (or none) if not enough grab you.",
  input_schema: {
    type: "object" as const,
    properties: {
      opens: {
        type: "array" as const,
        maxItems: 20,
        items: {
          type: "object" as const,
          properties: {
            email_id: {
              type: "string" as const,
              description: "The exact id of the email to open (from the [id] tag)",
            },
            reason: {
              type: "string" as const,
              description:
                "One-line gut reaction — why this one caught your eye. Plain, personal, honest.",
            },
          },
          required: ["email_id", "reason"],
        },
      },
    },
    required: ["opens"],
  },
};

export async function runOpenRound(
  persona: Persona,
  inbox: Email[],
): Promise<{ opens: OpenDecision[]; tokens: TokenCounts }> {
  const rendered = inbox
    .map(
      (e) =>
        `[${e.id}]  From: ${e.sender}\n  Subject: ${e.subject}\n  Preview: ${e.preheader}`,
    )
    .join("\n\n");

  const userPrompt = `It's a normal weeknight; you're glancing at your inbox after dinner. You see ${inbox.length} emails. You'll realistically tap to open at most 20 of them — likely fewer if not much grabs you. It's fine to skip the round entirely if nothing's worth your attention right now.

For each email you'd open, give a one-line gut reaction (the actual thought that pulled you in). Skip the rest.

Your inbox (presented in random order):

${rendered}

Call submit_opens with your picks.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(persona),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
    tools: [openTool],
    tool_choice: { type: "tool", name: "submit_opens" },
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use in open-round response: ${JSON.stringify(response.content).slice(0, 200)}`);
  }

  const parsed = OpenOutputSchema.parse(toolUse.input);
  return {
    opens: parsed.opens.map((o) => ({ emailId: o.email_id, reason: o.reason })),
    tokens: getTokens(response),
  };
}

// -----------------------------------------------------------------------------
// Round 2 — Click
// -----------------------------------------------------------------------------

const ClickOutputSchema = z.object({
  clicks: z
    .array(z.object({ email_id: z.string(), reason: z.string() }))
    .max(5),
});

const clickTool = {
  name: "submit_clicks",
  description:
    "Submit the emails that compel you to actually tap the CTA and visit the brand's site. At most 5. It's fine to click none.",
  input_schema: {
    type: "object" as const,
    properties: {
      clicks: {
        type: "array" as const,
        maxItems: 5,
        items: {
          type: "object" as const,
          properties: {
            email_id: { type: "string" as const },
            reason: {
              type: "string" as const,
              description:
                "One-line reason — what specifically in this email made you want to click",
            },
          },
          required: ["email_id", "reason"],
        },
      },
    },
    required: ["clicks"],
  },
};

export async function runClickRound(
  persona: Persona,
  openedEmails: Email[],
): Promise<{ clicks: ClickDecision[]; tokens: TokenCounts }> {
  if (openedEmails.length === 0) {
    return { clicks: [], tokens: emptyTokens() };
  }

  // Vision mode: when USE_VISION=1 and an email has a screenshot URL,
  // send the rendered email as an image (closer to what a real user sees)
  // instead of plain text. Falls back to text per-email if no screenshot.
  const useVision = process.env.USE_VISION === "1";
  const intro = `You opened ${openedEmails.length} of the emails. Now you're reading each one. You have the time / curiosity to actually tap the CTA and visit the brand's site on at most 5 of them — probably fewer. It's fine to click none.

For each one you'd click, one-line reason (what specifically in the email pulled you to act). Skip the rest.

The emails you opened:
`;
  const outro = `\nCall submit_clicks with your picks.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = [{ type: "text", text: intro }];
  for (const e of openedEmails) {
    const header = `\n=====================================
[${e.id}]
From: ${e.sender}
Subject: ${e.subject}
Preview: ${e.preheader}`;
    if (useVision && e.previewScreenshotUrl) {
      content.push({ type: "text", text: header });
      content.push({
        type: "image",
        source: { type: "url", url: e.previewScreenshotUrl },
      });
      content.push({ type: "text", text: "=====================================" });
    } else {
      content.push({
        type: "text",
        text: `${header}\n\nBody:\n${e.bodyText}\n=====================================`,
      });
    }
  }
  content.push({ type: "text", text: outro });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(persona),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content }],
    tools: [clickTool],
    tool_choice: { type: "tool", name: "submit_clicks" },
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use in click-round response`);
  }

  const parsed = ClickOutputSchema.parse(toolUse.input);
  return {
    clicks: parsed.clicks.map((c) => ({ emailId: c.email_id, reason: c.reason })),
    tokens: getTokens(response),
  };
}

// -----------------------------------------------------------------------------
// Round 3 — Buy
// -----------------------------------------------------------------------------

const BuyOutputSchema = z.object({
  purchases: z.array(
    z.object({
      product_id: z.string(),
      spent: z.number(),
      reason: z.string(),
    }),
  ),
  total_spent: z.number(),
});

const buyTool = {
  name: "submit_purchases",
  description:
    "Submit what you actually buy this week from the sites you clicked through to. You have a $100 budget but you absolutely don't need to spend it — most weeks people spend $0 from email. Submit purchases:[] if you don't want to buy anything.",
  input_schema: {
    type: "object" as const,
    properties: {
      purchases: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            product_id: { type: "string" as const },
            spent: {
              type: "number" as const,
              description: "Dollars spent on this product (must be ≤ product price × reasonable quantity)",
            },
            reason: {
              type: "string" as const,
              description: "One-line why — specific to the product, not generic",
            },
          },
          required: ["product_id", "spent", "reason"],
        },
      },
      total_spent: {
        type: "number" as const,
        description: "Total $ spent across all purchases. Must be ≤ 100.",
      },
    },
    required: ["purchases", "total_spent"],
  },
};

export async function runBuyRound(
  persona: Persona,
  productsForClickedBrands: Product[],
): Promise<{ purchases: PurchaseDecision[]; totalSpent: number; tokens: TokenCounts }> {
  if (productsForClickedBrands.length === 0) {
    return { purchases: [], totalSpent: 0, tokens: emptyTokens() };
  }

  const rendered = productsForClickedBrands
    .map(
      (p) =>
        `=====================================
[${p.id}]  ${p.name} — $${p.price.toFixed(2)}
Brand: ${p.brandId}
${p.description}
=====================================`,
    )
    .join("\n\n");

  const userPrompt = `You clicked through to the sites for ${productsForClickedBrands.length} ${productsForClickedBrands.length === 1 ? "email" : "emails"}. You have $100 of discretionary money this week. You absolutely don't need to spend any of it — most weeks people spend $0 from email.

What you're looking at on each site (one primary product per brand):

${rendered}

What (if anything) do you buy this week? For each purchase: product id, how much you spend (typically just the price), and a one-line reason that's specific to you. If nothing's worth it, submit purchases:[] with total_spent:0. Don't force a purchase.

Call submit_purchases.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(persona),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
    tools: [buyTool],
    tool_choice: { type: "tool", name: "submit_purchases" },
  });

  const toolUse = response.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`No tool_use in buy-round response`);
  }

  const parsed = BuyOutputSchema.parse(toolUse.input);
  return {
    purchases: parsed.purchases.map((p) => ({
      productId: p.product_id,
      spent: p.spent,
      reason: p.reason,
    })),
    totalSpent: parsed.total_spent,
    tokens: getTokens(response),
  };
}

// -----------------------------------------------------------------------------
// Cost tracking helpers
// -----------------------------------------------------------------------------

export type TokenCounts = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
};

function emptyTokens(): TokenCounts {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
}

function getTokens(response: Anthropic.Messages.Message): TokenCounts {
  const u = response.usage;
  return {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheReadTokens: (u as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0,
  };
}

export function sumTokens(a: TokenCounts, b: TokenCounts): TokenCounts {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  };
}
