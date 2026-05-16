// Core types for inbox-wars. End-state shape — keep stable.

export type Persona = {
  id: string;
  name: string;
  age: number;
  shortBio: string; // one line for UI cards
  longProfile: string; // 2 paragraphs of rich grounding — the actual system-prompt content
  stratum?: Record<string, string>; // axis_name -> value (present for stratified personas)
};

export type Email = {
  id: string;
  brandId: string;
  brandName: string;
  sender: string; // 'Aesop <hello@aesop.com>'
  subject: string;
  preheader: string;
  bodyText: string; // plain text body for round-2 input
  heroImageUrl?: string; // for UI; agent doesn't currently see images
  previewScreenshotUrl?: string; // full rendered email screenshot (Rendit URL for kopi-authored)
};

export type Product = {
  id: string;
  brandId: string;
  name: string;
  price: number; // dollars (USD), float allowed
  description: string;
  thumbnailUrl?: string;
};

export type Arm = "A" | "B";

export type OpenDecision = { emailId: string; reason: string };
export type ClickDecision = { emailId: string; reason: string };
export type PurchaseDecision = {
  productId: string;
  spent: number;
  reason: string;
};

export type AgentRunResult = {
  personaId: string;
  arm: Arm;
  candidateEmailId: string; // the test email in this arm's inbox
  inboxOrder: string[]; // shuffled email IDs as the agent ACTUALLY saw them (per-agent position-bias mitigation)
  round1: { opens: OpenDecision[] };
  round2: { clicks: ClickDecision[] };
  round3: { purchases: PurchaseDecision[]; totalSpent: number };
  // For cost tracking / debugging
  cost: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
};

export type ArmAggregate = {
  arm: Arm;
  candidateEmailId: string;
  openedBy: number; // # of personas who opened the candidate email
  clickedBy: number;
  purchasedBy: number;
  revenue: number; // sum of $ spent on the candidate's brand across all personas
  totalPersonas: number;
};

export type SimulationResult = {
  arms: { A: ArmAggregate; B: ArmAggregate };
  agentRuns: AgentRunResult[];
  totalCost: { inputTokens: number; outputTokens: number; cacheReadTokens: number };
};
