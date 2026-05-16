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
