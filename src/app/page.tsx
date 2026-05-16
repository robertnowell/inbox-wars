// Entry point — always the setup view. Run navigates to /r/[slug].

import { DemoSetupEntry } from "@/components/demo-flow";

export const dynamic = "force-dynamic";

export default function Home() {
  return <DemoSetupEntry />;
}
