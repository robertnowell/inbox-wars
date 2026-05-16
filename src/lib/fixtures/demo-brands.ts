// Hand-curated fixture metadata for the demo flow.
// Three brands the user can pick — all backed by REAL kopi data:
//   - real audience psychographics (brand_embedding_chunks.audience)
//   - real authored emails with real Rendit-uploaded screenshots
//   - real product catalog (brand_products with embeddings)
//
// Each brand has a cached SavedRun at runs/brand-<id>.json so the demo can
// switch between them without re-running.

export type DemoEmailOption = {
  chatId: string;
  subject: string;
  preheader: string;
  screenshotUrl: string;
};

export type DemoBrand = {
  id: string;
  slug: string; // url-safe identifier, e.g. "mirai", "gymshark", "everlane"
  name: string;
  blurb: string;
  category: string;
  defaultA: string;
  defaultB: string;
  emails: DemoEmailOption[];
};

export const DEMO_BRANDS: DemoBrand[] = [
  {
    id: "51IbVnKsvsalX66sLGjmy_WU3CexdP",
    slug: "mirai",
    name: "Mirai Clinical",
    blurb: "Japanese-formulated body care for the 45+ market",
    category: "body care",
    defaultA: "GDjhImfGuo",
    defaultB: "hI30rpIrWp",
    emails: [
      {
        chatId: "GDjhImfGuo",
        subject: "There's a name for that \"older\" smell",
        preheader: "It's called Nonenal — and your regular soap doesn't touch it.",
        screenshotUrl: "https://file.rendit.io/n/97afd714980c.png",
      },
      {
        chatId: "hI30rpIrWp",
        subject: "Facebook Going Crazy Over Persimmon Detergent",
        preheader: "Only U.S. laundry detergent that eliminates Nonenal aging odor.",
        screenshotUrl: "https://file.rendit.io/n/b1a210f8f5f8.png",
      },
      {
        chatId: "e4TNCgHmj1",
        subject: "HuffPost Confirms: \"Old Person Smell\" Is Real?",
        preheader: "Medical experts explain the science behind Nonenal and aging skin.",
        screenshotUrl: "https://file.rendit.io/n/b384b26886a2.png",
      },
      {
        chatId: "9p1Seuln4A",
        subject: "HuffPost Confirms: \"Old Person Smell\" Is Real?",
        preheader: "Medical experts explain the science behind Nonenal and aging skin.",
        screenshotUrl: "https://file.rendit.io/n/dd71662e576c.png",
      },
      {
        chatId: "EXeRL3JiLj",
        subject: "Memorial Day: 20% Off + Points Expire",
        preheader: "Stack sitewide savings with your rewards before they vanish.",
        screenshotUrl: "https://file.rendit.io/n/a8746eae1149.png",
      },
    ],
  },
  {
    id: "WbFWZRWK5oVrdYoacO29W",
    slug: "gymshark",
    name: "Gymshark",
    blurb: "Performance apparel for Gen Z & millennial lifters",
    category: "fitness apparel",
    defaultA: "3JaFCWLn4V",
    defaultB: "Nr2ymsryiP",
    emails: [
      {
        chatId: "3JaFCWLn4V",
        subject: "BUILT FOR THE HEAVIEST LIFTS",
        preheader: "Proprietary Seamless knit. Unrestricted movement for grueling sessions.",
        screenshotUrl: "https://file.rendit.io/n/42f6b19ebc04.png",
      },
      {
        chatId: "AU0eZUOqW0",
        subject: "Skip the egg hunt. Hit the iron.",
        preheader: "Men's stringers and shorts built for the work. Free shipping over $75.",
        screenshotUrl: "https://file.rendit.io/n/9a6bd978e136.png",
      },
      {
        chatId: "s2LV8EodwQ",
        subject: "Mid-terms are stressful. The squat rack isn't.",
        preheader: "Step away from the books. Claim your 15% student discount now.",
        screenshotUrl: "https://file.rendit.io/n/3636be3ccc2f.png",
      },
      {
        chatId: "4CmTK6v6Pg",
        subject: "Gear up for the Gymshark66 challenge.",
        preheader: "Shop durable January bestsellers designed to help you perform at your peak.",
        screenshotUrl: "https://file.rendit.io/n/eda0e664cea5.png",
      },
      {
        chatId: "Nr2ymsryiP",
        subject: "66 days to change your life.",
        preheader: "Commit to Gymshark66 today and transform your fitness habits.",
        screenshotUrl: "https://file.rendit.io/n/ffe8d1cdc7f9.png",
      },
      {
        chatId: "a3rJJWi24F",
        subject: "ZERO RESTRICTION. RELENTLESS DURABILITY.",
        preheader: "Engineered for heavy lifting. Proprietary knit technology built to perform.",
        screenshotUrl: "https://file.rendit.io/n/782b74a5c18f.png",
      },
      {
        chatId: "HgUT1YD7iM",
        subject: "SEAMLESS IS BACK. SECURE YOUR GEAR.",
        preheader: "Proprietary Seamless technology and new monochrome colorways just dropped.",
        screenshotUrl: "https://file.rendit.io/n/0e4e7778ecb6.png",
      },
    ],
  },
  {
    id: "blrJdldSEz",
    slug: "everlane",
    name: "Everlane",
    blurb: "Considered fashion at honest prices",
    category: "considered fashion",
    defaultA: "QRUM1BeYbb",
    defaultB: "C4VwLjZbMa",
    emails: [
      {
        chatId: "QRUM1BeYbb",
        subject: "Memorial Day: 25% Off, Honestly.",
        preheader: "Bold summer essentials, transparently priced. Sale ends Monday at midnight.",
        screenshotUrl: "https://file.rendit.io/n/8edf27183c61.png",
      },
      {
        chatId: "C4VwLjZbMa",
        subject: "Yours first: The new collection.",
        preheader: "VIP doors open 48 hours early. Shop before everyone else.",
        screenshotUrl: "https://file.rendit.io/n/c8f37cb628b6.png",
      },
      {
        chatId: "wCAS482YAr",
        subject: "Welcome to Everlane — 10% off inside",
        preheader: "Modern essentials, transparent pricing, and a little something to start your wardrobe.",
        screenshotUrl: "https://file.rendit.io/n/cd1819b27ae3.png",
      },
      {
        chatId: "uBZDQTTZHH",
        subject: "Yours first: the new collection",
        preheader: "A quiet 48-hour window before everyone else gets in.",
        screenshotUrl: "https://file.rendit.io/n/074da9598ffb.png",
      },
      {
        chatId: "tV2FFO5lB8",
        subject: "Welcome to Everlane.",
        preheader: "Modern essentials, ethically made. Here's 10% off to start your wardrobe.",
        screenshotUrl: "https://file.rendit.io/n/03ae1e5cd134.png",
      },
      {
        chatId: "xKJfGORzwO",
        subject: "VIPs first: the new collection.",
        preheader: "48 hours of early access. Just for you, before everyone else.",
        screenshotUrl: "https://file.rendit.io/n/198e9a8d3865.png",
      },
      {
        chatId: "M5hR1gHC6E",
        subject: "Welcome. Here's 10% off.",
        preheader: "Modern essentials, made ethically and priced transparently.",
        screenshotUrl: "https://file.rendit.io/n/eceaad007d61.png",
      },
    ],
  },
];

export function getDemoBrand(id: string): DemoBrand | undefined {
  return DEMO_BRANDS.find((b) => b.id === id);
}

export function getDemoBrandBySlug(slug: string): DemoBrand | undefined {
  return DEMO_BRANDS.find((b) => b.slug === slug);
}

/** Available competitor brands (Milled-sourced). User can pick 5-12 for their inbox. */
export const AVAILABLE_COMPETITORS = [
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

/** Default set the user starts with (all 9). */
export const DEFAULT_COMPETITORS = [...AVAILABLE_COMPETITORS];
