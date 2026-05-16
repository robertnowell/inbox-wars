// Hand-curated fixture metadata for the demo flow.
// Three brands the user can pick — all backed by REAL kopi data:
//   - real audience psychographics (brand_embedding_chunks.audience)
//   - real authored emails with screenshots (chat + message_artifact)
//   - real product catalog (brand_products with embeddings)
//
// To "work" in a demo run, each brand must also have a cached SavedRun at
// runs/brand-<id>.json. Mirai is the canonical demo; Gymshark/Everlane are
// regenerated via:
//   pnpm sim --brand=<id> --email-a=<chatId> --email-b=<chatId>

export type DemoEmailOption = {
  chatId: string;
  subject: string;
};

export type DemoBrand = {
  id: string;
  name: string;
  blurb: string; // one-liner shown in the setup dropdown
  category: string; // e.g. "body care", "fitness apparel"
  emails: DemoEmailOption[]; // ≥5 real emails the user can pick A/B from
  defaultA: string; // chatId
  defaultB: string; // chatId
};

export const DEMO_BRANDS: DemoBrand[] = [
  {
    id: "51IbVnKsvsalX66sLGjmy_WU3CexdP",
    name: "Mirai Clinical",
    blurb: "Japanese-formulated body care for the 45+ market",
    category: "body care",
    defaultA: "GDjhImfGuo",
    defaultB: "hI30rpIrWp",
    emails: [
      { chatId: "GDjhImfGuo", subject: "There's a name for that \"older\" smell" },
      { chatId: "hI30rpIrWp", subject: "Facebook Going Crazy Over Persimmon Detergent" },
      { chatId: "e4TNCgHmj1", subject: "HuffPost Confirms: \"Old Person Smell\" Is Real?" },
      { chatId: "9p1Seuln4A", subject: "HuffPost Confirms: \"Old Person Smell\" Is Real?" },
      { chatId: "EXeRL3JiLj", subject: "Memorial Day: 20% Off + Points Expire" },
    ],
  },
  {
    id: "WbFWZRWK5oVrdYoacO29W",
    name: "Gymshark",
    blurb: "Performance apparel for Gen Z & millennial lifters",
    category: "fitness apparel",
    defaultA: "3JaFCWLn4V",
    defaultB: "AU0eZUOqW0",
    emails: [
      { chatId: "3JaFCWLn4V", subject: "BUILT FOR THE HEAVIEST LIFTS" },
      { chatId: "AU0eZUOqW0", subject: "Skip the egg hunt. Hit the iron." },
      { chatId: "s2LV8EodwQ", subject: "Mid-terms are stressful. The squat rack isn't." },
      { chatId: "4CmTK6v6Pg", subject: "Gear up for the Gymshark66 challenge." },
      { chatId: "Nr2ymsryiP", subject: "66 days to change your life." },
      { chatId: "a3rJJWi24F", subject: "ZERO RESTRICTION. RELENTLESS DURABILITY." },
      { chatId: "HgUT1YD7iM", subject: "SEAMLESS IS BACK. SECURE YOUR GEAR." },
    ],
  },
  {
    id: "blrJdldSEz",
    name: "Everlane",
    blurb: "Considered fashion at honest prices",
    category: "considered fashion",
    defaultA: "QRUM1BeYbb",
    defaultB: "C4VwLjZbMa",
    emails: [
      { chatId: "QRUM1BeYbb", subject: "Memorial Day: 25% Off, Honestly." },
      { chatId: "C4VwLjZbMa", subject: "Yours first: The new collection." },
      { chatId: "wCAS482YAr", subject: "Welcome to Everlane — 10% off inside" },
      { chatId: "uBZDQTTZHH", subject: "Yours first: the new collection" },
      { chatId: "tV2FFO5lB8", subject: "Welcome to Everlane." },
      { chatId: "xKJfGORzwO", subject: "VIPs first: the new collection." },
      { chatId: "M5hR1gHC6E", subject: "Welcome. Here's 10% off." },
    ],
  },
];

export function getDemoBrand(id: string): DemoBrand | undefined {
  return DEMO_BRANDS.find((b) => b.id === id);
}

/** The 9 Milled-sourced competitor brands shown in every inbox. */
export const COMPETITOR_BRANDS = [
  "Rhode",
  "Versed",
  "Tower 28 Beauty",
  "Nécessaire",
  "Salt & Stone",
  "Tracksmith",
  "Glossier",
  "Lumin",
  "Olipop",
];
