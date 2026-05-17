// Setup entry — the page that lets users pick brand, A vs B, and run a sim.
// Previously lived at /; moved here so / can be the landing page.

import { DemoSetupEntry } from "@/components/demo-flow";

export const dynamic = "force-dynamic";

export default function Simulation() {
  return <DemoSetupEntry />;
}
