// Run persistence — saves SimulationResult + denormalized context (emails, personas, products)
// to a single JSON file so the UI can render without re-fetching from kopi DB.

import fs from "node:fs";
import path from "node:path";
import type {
  AgentRunResult,
  ArmAggregate,
  Email,
  Persona,
  Product,
  SimulationResult,
} from "./types";
import type { StratAxis } from "./persona-gen";

const RUNS_DIR = path.resolve(process.cwd(), "runs");

export type SavedRun = {
  id: string;
  generatedAt: string; // ISO
  brandId: string;
  brandName: string;
  audienceExcerpt: string; // ~500 chars from the brand's audience chunk
  axes: StratAxis[]; // stratification axes used to generate personas
  candidateA: Email; // includes previewScreenshotUrl
  candidateB: Email;
  backgroundEmails: Email[]; // the 9 Milled-sourced inbox noise emails
  personas: Persona[]; // includes stratum
  agentRuns: AgentRunResult[]; // 2 per persona (one per arm)
  aggregated: { A: ArmAggregate; B: ArmAggregate };
  productsById: Record<string, Product>; // map of all products the agents could/did buy
  totalCost: SimulationResult["totalCost"];
  // OPTIONAL: products surfaced to the agent for each candidate email
  // (mediaPlan.products primary, embedding-closest fallback). Populated
  // server-side at request time so we can always show ≥1 product per email
  // in the running viz, without needing to regenerate the cached run.
  candidateAProducts?: Product[];
  candidateBProducts?: Product[];
};

export function saveRun(run: SavedRun): string {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  const json = JSON.stringify(run, null, 2);
  const filePath = path.join(RUNS_DIR, `${run.id}.json`);
  fs.writeFileSync(filePath, json);
  // Per-brand "latest" pointer so the demo can switch brands without losing runs
  fs.writeFileSync(path.join(RUNS_DIR, `brand-${run.brandId}.json`), json);
  // Global latest pointer (back-compat)
  fs.writeFileSync(path.join(RUNS_DIR, "latest.json"), json);
  return filePath;
}

export function loadLatestRun(): SavedRun | null {
  const fp = path.join(RUNS_DIR, "latest.json");
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf-8")) as SavedRun;
}

export function loadRunById(id: string): SavedRun | null {
  const fp = path.join(RUNS_DIR, `${id}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf-8")) as SavedRun;
}

export function loadRunForBrand(brandId: string): SavedRun | null {
  const fp = path.join(RUNS_DIR, `brand-${brandId}.json`);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf-8")) as SavedRun;
}

/**
 * Load the cached run for a specific (A, B) email pair.
 * Files are stored once per unordered pair (alphabetically sorted IDs).
 * If user requests reverse order, swap the arm labels at load time.
 * Falls back to the brand-level cached run if the specific pair isn't found.
 */
export function loadRunForPair(
  brandId: string,
  emailAId: string,
  emailBId: string,
): SavedRun | null {
  const sorted = [emailAId, emailBId].sort();
  const key = sorted.join("__");
  const fp = path.join(RUNS_DIR, `brand-${brandId}__${key}.json`);
  if (!fs.existsSync(fp)) {
    return loadRunForBrand(brandId);
  }
  const stored = JSON.parse(fs.readFileSync(fp, "utf-8")) as SavedRun;
  // If user's requested A matches the stored candidateA, serve as-is.
  if (stored.candidateA.id === emailAId) return stored;
  // Otherwise, swap arms so what user requested as "A" actually shows as A.
  return swapArms(stored);
}

/** Relabel a SavedRun so arm A becomes arm B and vice versa. Inbox order stays. */
function swapArms(run: SavedRun): SavedRun {
  return {
    ...run,
    candidateA: run.candidateB,
    candidateB: run.candidateA,
    aggregated: {
      A: { ...run.aggregated.B, arm: "A" },
      B: { ...run.aggregated.A, arm: "B" },
    },
    agentRuns: run.agentRuns.map((r) => ({
      ...r,
      arm: r.arm === "A" ? "B" : "A",
      candidateEmailId:
        r.candidateEmailId === run.candidateA.id
          ? run.candidateB.id
          : run.candidateA.id,
    })),
  };
}
