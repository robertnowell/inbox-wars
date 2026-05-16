// QUICK-AND-DIRTY v0.5 FIXTURES.
// To be replaced with real kopi DB + Milled-ingested emails + LLM-generated products.
// The shapes here match types.ts and what the production loader will produce.

import type { Persona, Email, Product } from "./types";

// -----------------------------------------------------------------------------
// 1 sample persona (v0.5 — scale to 50 once data sourcing is wired)
// -----------------------------------------------------------------------------

export const samplePersona: Persona = {
  id: "p_maya",
  name: "Maya Rojas",
  age: 34,
  shortBio: "Design-lead, careful spender, into clean-beauty rituals",
  longProfile: `I'm a 34-year-old product designer in Brooklyn. I live with my partner and our dog. I work from home most days. My weekday mornings are routine — coffee, news, slow start. I check email at lunch and before bed; I'm rarely "browsing" my inbox, I'm scanning it for anything that earns my attention.

I'm careful with money. I make decent money but I save aggressively because I want a down payment in 3 years. I buy from brands I already love (Aesop, Necessaire, Tracksmith for running, Glossier when they actually launch something new) but I rarely impulse-buy from email. I'm skeptical of "last chance!" and "exclusive!" language — it triggers my BS detector. I respond to: specific product news (a new SPF formulation, not "summer essentials"), genuinely good writing (Drunk Elephant occasionally nails this), and editorial content that helps me think (the better Aesop emails). I almost never click discount-only emails. I'd rather pay full price for something I want than $5 off something I don't.

I run 3–4 times a week and care about my skin. I don't wear makeup most days. I'm not into trends. I'd rather buy one beautifully-made thing every 2 months than 5 mediocre things a month.`,
};

// -----------------------------------------------------------------------------
// Two candidate emails for the same client brand (the A/B test subject)
// In production: user pastes these at runtime.
// -----------------------------------------------------------------------------

const CLIENT_BRAND_ID = "aesop";
const CLIENT_BRAND_NAME = "Aesop";

export const candidateA: Email = {
  id: "candidate_A",
  brandId: CLIENT_BRAND_ID,
  brandName: CLIENT_BRAND_NAME,
  sender: "Aesop <hello@aesop.com>",
  subject: "Last chance: 15% off bestsellers ends tonight",
  preheader: "Stock up on the Aesop classics before midnight.",
  bodyText: `Last chance — 15% off our bestselling formulations ends tonight at midnight.

Don't miss out on the Resurrection Aromatique Hand Wash, Marrakech Eau de Toilette, and Parsley Seed Anti-Oxidant Serum at a rare discount.

Use code BESTSELLERS at checkout.

Shop now →

This offer ends in 6 hours.`,
};

export const candidateB: Email = {
  id: "candidate_B",
  brandId: CLIENT_BRAND_ID,
  brandName: CLIENT_BRAND_NAME,
  sender: "Aesop <hello@aesop.com>",
  subject: "An essay on patience, and a new mineral SPF",
  preheader: "Reflections from our formulation team on slow skincare.",
  bodyText: `Patience is a discipline we have come to value deeply at Aesop.

Our chemists spent four years on a single question: how do you make a mineral sunscreen that feels weightless and leaves no white cast on darker skin tones, without compromising on UV protection or the texture our customers expect?

The result, Erato Mineral SPF 50, launches today. It is the first sunscreen we have ever made. We hope it will be the last we need to.

Read the essay →
View the product →

A reflection from our formulation lead, Sara Mitchell.`,
};

// -----------------------------------------------------------------------------
// 5 background emails — competitor + adjacent brands, identical across A and B
// In production: 99 emails pulled from kopi DB (Milled-ingested).
// -----------------------------------------------------------------------------

export const backgroundEmails: Email[] = [
  {
    id: "bg_glossier",
    brandId: "glossier",
    brandName: "Glossier",
    sender: "Glossier <newsletter@glossier.com>",
    subject: "Your weekly glow check-in",
    preheader: "What we're putting on our faces this week.",
    bodyText:
      "Hi, it's us. This week we're loving Futuredew layered under your favorite tint. Plus: a behind-the-scenes look at our new packaging. Shop the routine →",
  },
  {
    id: "bg_drunkelephant",
    brandId: "drunkelephant",
    brandName: "Drunk Elephant",
    sender: "Drunk Elephant <hello@drunkelephant.com>",
    subject: "Why we removed silicones from our entire line",
    preheader: "The Suspicious 6 just got expanded.",
    bodyText:
      "Eight years ago we banned the Suspicious 6 — six ingredient groups we believe disrupt skin's natural function. This year, we're adding silicones to that list. Here's why, and what it changes in your routine. Read the full ingredient story →",
  },
  {
    id: "bg_necessaire",
    brandId: "necessaire",
    brandName: "Nécessaire",
    sender: "Nécessaire <hi@necessaire.com>",
    subject: "Body wash, redesigned",
    preheader: "Now with 15 essential vitamins and minerals.",
    bodyText:
      "Five years in, we've redesigned The Body Wash. Same dermatologist-formulated cleanser, now fortified with 15 vitamins and minerals — magnesium, niacinamide, glycerin. Same $25, same recyclable bottle. Shop the reformulation →",
  },
  {
    id: "bg_tracksmith",
    brandId: "tracksmith",
    brandName: "Tracksmith",
    sender: "Tracksmith <hello@tracksmith.com>",
    subject: "Long run season",
    preheader: "Singlets, shorts, and our new long-distance vest.",
    bodyText:
      "It's that time of year. Marathon training kicks off this month for thousands of runners — and our new Allston Long-Distance Vest is built for the 16+ mile days. Lightweight, deeply pocketed, and made in Massachusetts. Shop running essentials →",
  },
  {
    id: "bg_stitchfix",
    brandId: "stitchfix",
    brandName: "Stitch Fix",
    sender: "Stitch Fix <stylist@stitchfix.com>",
    subject: "Your stylist picked 5 things for you",
    preheader: "Open to see what's coming in your next Fix.",
    bodyText:
      "Hey Maya — your stylist Jenna picked 5 pieces for your upcoming Fix. Highlights: a transitional blazer, a striped tee, two pairs of comfortable wide-leg trousers, and a delicate gold necklace. View your Fix →",
  },
];

// -----------------------------------------------------------------------------
// Primary products per brand (for round 3)
// In production: LLM-generated from Milled email content, or pulled from kopi brandProducts.
// -----------------------------------------------------------------------------

export const sampleProducts: Product[] = [
  {
    id: "prod_aesop_spf",
    brandId: "aesop",
    name: "Erato Mineral SPF 50",
    price: 65,
    description:
      "Aesop's first mineral sunscreen. Lightweight, no white cast, four years in development. 50ml.",
  },
  {
    id: "prod_glossier_futuredew",
    brandId: "glossier",
    name: "Futuredew",
    price: 26,
    description:
      "A serum-oil hybrid that gives skin a dewy, lit-from-within glow without makeup. 1.7 fl oz.",
  },
  {
    id: "prod_drunkelephant_protini",
    brandId: "drunkelephant",
    name: "Protini Polypeptide Cream",
    price: 72,
    description:
      "A protein moisturizer with signal peptides, growth factors, and amino acids. 1.69 fl oz.",
  },
  {
    id: "prod_necessaire_bodywash",
    brandId: "necessaire",
    name: "The Body Wash",
    price: 25,
    description:
      "Dermatologist-formulated body wash with 15 essential vitamins and minerals. 16.9 fl oz. Eucalyptus scent.",
  },
  {
    id: "prod_tracksmith_vest",
    brandId: "tracksmith",
    name: "Allston Long-Distance Vest",
    price: 88,
    description:
      "Lightweight running vest with deep pockets for fuel + phone. Made in Massachusetts. Men's and women's sizing.",
  },
  {
    id: "prod_stitchfix_blazer",
    brandId: "stitchfix",
    name: "Transitional Linen Blazer",
    price: 98,
    description:
      "Unstructured linen-blend blazer in olive. Picked by your stylist for your fall transition wardrobe.",
  },
];

// Convenience: indexed by brand for the orchestrator
export const productsByBrand = new Map(sampleProducts.map((p) => [p.brandId, p]));
