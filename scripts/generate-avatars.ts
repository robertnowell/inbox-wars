// Generate per-persona portrait avatars via Gemini 2.5 Flash Image.
// Reads personas from runs/latest.json, writes PNGs to public/personas/<id>.png.
// Idempotent — skips personas that already have a saved avatar.
//
// Usage:  pnpm gen-avatars            # generate any missing avatars
//         pnpm gen-avatars --force    # regenerate all

import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const OUT_DIR = path.resolve(process.cwd(), "public/personas");
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview";

type Persona = {
  id: string;
  name: string;
  age?: number;
  shortBio?: string;
  longProfile?: string;
};

function loadPersonas(): Persona[] {
  // Aggregate personas across ALL per-brand cached runs so we cover every
  // brand the demo can switch to.
  const seen = new Set<string>();
  const merged: Persona[] = [];
  if (!fs.existsSync(RUNS_DIR)) {
    console.error(`No runs dir at ${RUNS_DIR}. Run 'pnpm sim' first.`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(RUNS_DIR)
    .filter((f) => f.startsWith("brand-") && f.endsWith(".json"));
  if (files.length === 0) {
    // Fall back to latest.json for back-compat
    const fp = path.join(RUNS_DIR, "latest.json");
    if (!fs.existsSync(fp)) {
      console.error("No brand-*.json or latest.json found. Run 'pnpm sim' first.");
      process.exit(1);
    }
    files.push("latest.json");
  }
  for (const f of files) {
    const run = JSON.parse(fs.readFileSync(path.join(RUNS_DIR, f), "utf8"));
    for (const p of run.personas ?? []) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
  }
  return merged;
}

function buildPrompt(p: Persona): string {
  // The bio carries occupation, location, life-stage cues. We want the avatar
  // to read as a real specific person, not a stock photo or stylized illustration.
  // Style is editorial-documentary: warm natural light, plain cream background,
  // soft sober expression — matches the lab-notebook aesthetic.
  return [
    `Editorial documentary portrait photograph of ${p.name}, a ${p.age}-year-old person.`,
    `Background: ${p.shortBio ?? ""}`,
    ``,
    `Style requirements:`,
    `- Photo-realistic, NOT illustration, NOT painting, NOT 3D render`,
    `- Head and shoulders, looking slightly off-camera with a calm, composed expression (not smiling broadly)`,
    `- Soft natural window light from one side, warm color temperature`,
    `- Plain warm cream/off-white seamless background (#faf9f5 tone), shallow depth of field`,
    `- Subject's clothing is understated, neutral colors, age-appropriate`,
    `- Their face should clearly read as ${p.age} years old — show natural age, lines, character`,
    `- Ethnicity and appearance should fit the name and described background authentically`,
    `- Frame: square 1:1, subject centered, head fills upper two-thirds of frame`,
    `- Mood: documentary/editorial portraiture, the kind of photo that would run in a longform magazine profile`,
    ``,
    `Do not include any text, logos, or graphic elements. Just the portrait.`,
  ].join("\n");
}

async function generateOne(
  ai: GoogleGenAI,
  persona: Persona,
  outPath: string,
): Promise<void> {
  const prompt = buildPrompt(persona);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  // Find the image part in the response
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const buffer = Buffer.from(part.inlineData.data, "base64");
      fs.writeFileSync(outPath, buffer);
      return;
    }
  }
  // If no image came back, dump the text response for debugging
  const text = parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join(" ");
  throw new Error(
    `No image returned for ${persona.name}. Model said: ${text.slice(0, 200)}`,
  );
}

async function main() {
  const force = process.argv.includes("--force");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const personas = loadPersonas();
  if (personas.length === 0) {
    console.error("No personas found in latest run.");
    process.exit(1);
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error("GOOGLE_GENERATIVE_AI_API_KEY missing from env.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  console.log(`Generating ${personas.length} avatars → ${OUT_DIR}`);
  console.log(`Model: ${MODEL}\n`);

  const results: Array<{ persona: string; status: "skipped" | "done" | "error"; detail?: string }> = [];

  for (const p of personas) {
    const outPath = path.join(OUT_DIR, `${p.id}.png`);
    const exists = fs.existsSync(outPath);

    if (exists && !force) {
      results.push({ persona: p.name, status: "skipped", detail: "already exists" });
      console.log(`  ⊘  ${p.name.padEnd(28)}  (skipped — ${path.basename(outPath)} exists)`);
      continue;
    }

    process.stdout.write(`  ⋯  ${p.name.padEnd(28)}  generating...`);
    const t0 = Date.now();
    try {
      await generateOne(ai, p, outPath);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      const bytes = fs.statSync(outPath).size;
      process.stdout.write(`\r  ✓  ${p.name.padEnd(28)}  ${dt}s  ${(bytes / 1024).toFixed(0)}KB\n`);
      results.push({ persona: p.name, status: "done" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`\r  ✗  ${p.name.padEnd(28)}  ERROR: ${msg.slice(0, 100)}\n`);
      results.push({ persona: p.name, status: "error", detail: msg });
    }
  }

  const done = results.filter((r) => r.status === "done").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;
  console.log();
  console.log(`Done: ${done} generated · ${skipped} skipped · ${errors} errors`);
}

main().catch((err) => {
  console.error("Avatar generation failed:", err);
  process.exit(1);
});
