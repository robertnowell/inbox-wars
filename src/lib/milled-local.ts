// Background-email loader for inbox-wars — sources from the local Milled scrape output.
// The richer source of truth is on disk (subject + preheader + full HTML body + screenshot),
// not in kopi's DB (which only stores rendered screenshot URL + AI alt-text).
//
// Local layout (kopi worktree):
//   <base>/emails.jsonl     — 90 records, one JSON per line
//   <base>/html/*.html      — raw email HTML
//   <base>/shots/*.png      — clean headless-rendered screenshot
//
// Override via env: MILLED_BATCH_PATH=<absolute path to batch10-out>

import fs from "node:fs";
import path from "node:path";
import type { Email } from "./types";

const DEFAULT_BASE =
  "/Users/robertnowell/Projects/kopi/.claude/worktrees/milled-ingestion/milled/batch10-out";
const MILLED_BASE = process.env.MILLED_BATCH_PATH ?? DEFAULT_BASE;

type MilledRecord = {
  milled_url: string;
  brand_slug: string;
  brand_display: string;
  subject: string;
  preheader: string;
  sent_at: string;
  hero_image_url: string;
  image_urls: string[] | string;
  raw_html_path: string;
  screenshot_path: string;
};

function loadMilledRecords(): MilledRecord[] {
  const jsonlPath = path.join(MILLED_BASE, "emails.jsonl");
  if (!fs.existsSync(jsonlPath)) {
    throw new Error(
      `Milled jsonl not found at ${jsonlPath}. Set MILLED_BATCH_PATH if files moved.`,
    );
  }
  const content = fs.readFileSync(jsonlPath, "utf-8");
  return content
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<img[^>]*?\salt="([^"]*)"[^>]*?\/?>/gi, "\n[Image: $1]\n")
    .replace(/<img[^>]*?\/?>/gi, "")
    .replace(/<a\s+[^>]*?>([\s\S]*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

function brandSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Pull background inbox emails — one per brand by default (so a 10-brand corpus → 10 emails).
 * Reads subject + preheader from jsonl; body text from the raw HTML file.
 */
export function getMilledBackgroundEmails(limitPerBrand = 1): Email[] {
  const records = loadMilledRecords();

  // Group by brand_display (e.g., "Rhode", "Glossier")
  const byBrand = new Map<string, MilledRecord[]>();
  for (const rec of records) {
    const key = rec.brand_display;
    if (!byBrand.has(key)) byBrand.set(key, []);
    byBrand.get(key)!.push(rec);
  }

  const out: Email[] = [];
  for (const [brandName, recs] of byBrand) {
    const slug = brandSlug(brandName);
    for (const rec of recs.slice(0, limitPerBrand)) {
      let bodyText = rec.preheader;
      try {
        const htmlAbsPath = path.resolve(MILLED_BASE, rec.raw_html_path.replace(/^\.\//, ""));
        const html = fs.readFileSync(htmlAbsPath, "utf-8");
        bodyText = extractTextFromHtml(html).slice(0, 3000);
      } catch {
        // fall back to preheader if HTML missing
      }
      out.push({
        id: `bg_${slug}_${out.length}`,
        brandId: `milled-${slug}`,
        brandName,
        sender: `${brandName} <hello@${slug.replace(/-/g, "")}.com>`,
        subject: rec.subject,
        preheader: rec.preheader,
        bodyText,
      });
    }
  }
  return out;
}
