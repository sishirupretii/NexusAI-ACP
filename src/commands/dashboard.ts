// =============================================================================
// nexus dashboard — Revenue, jobs, and agents overview.
// =============================================================================

import * as output from "../lib/output.js";
import client from "../lib/client.js";
import { readConfig, formatPrice } from "../lib/config.js";
import { getMyAgentInfo } from "../lib/wallet.js";

interface WalletBalance {
  symbol: string;
  tokenBalance: string;
  decimals: number;
  tokenMetadata: { symbol: string | null; name: string | null; decimals: number | null };
  tokenPrices: { value: string }[];
}

function formatBalance(hexBalance: string, decimals: number): string {
  const raw = BigInt(hexBalance);
  if (raw === 0n) return "0";
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const remainder = raw % divisor;
  if (remainder === 0n) return whole.toString();
  const fracStr = remainder.toString().padStart(decimals, "0").replace(/0+$/, "").slice(0, 4);
  return `${whole}.${fracStr}`;
}

export async function overview(): Promise<void> {
  const config = readConfig();
  const agents = config.agents ?? [];
  const activeAgent = agents.find((a) => a.active);

  let agentInfo: any = null;
  let balances: WalletBalance[] = [];
  let activeJobs: any[] = [];
  let completedJobs: any[] = [];

  try {
    agentInfo = await getMyAgentInfo();
  } catch {
    /* Non-fatal */
  }

  try {
    const { data } = await client.get("/acp/wallet-balances");
    balances = data?.data ?? [];
  } catch {
    /* Non-fatal */
  }

  try {
    const { data } = await client.get("/acp/jobs/active");
    activeJobs = data?.data ?? data ?? [];
  } catch {
    /* Non-fatal */
  }

  try {
    const { data } = await client.get("/acp/jobs/completed");
    completedJobs = data?.data ?? data ?? [];
  } catch {
    /* Non-fatal */
  }

  const dashData = {
    agent: agentInfo,
    balances,
    activeJobs: activeJobs.length,
    completedJobs: completedJobs.length,
    totalAgents: agents.length,
    offerings: agentInfo?.jobs?.length ?? 0,
    token: agentInfo?.token,
    tokenAddress: agentInfo?.tokenAddress,
  };

  output.output(dashData, (data) => {
    // Header
    const isTTY = process.stdout.isTTY === true;
    const magenta = (s: string) => (isTTY ? `\x1b[35m${s}\x1b[0m` : s);

    console.log("");
    console.log(magenta("  ╔══════════════════════════════════════════════════════╗"));
    console.log(
      magenta("  ║") +
        output.colors.bold("         NexusAI Claw Dashboard                    ") +
        magenta("║")
    );
    console.log(magenta("  ╚══════════════════════════════════════════════════════╝"));
    console.log("");

    // Agent Info
    output.log("  " + output.colors.bold("Agent"));
    output.field("Name", data.agent?.name || "(not configured)");
    output.field("Wallet", data.agent?.walletAddress || "-");
    output.field("Total Agents", String(data.totalAgents));
    output.log("");

    // Wallet
    output.log("  " + output.colors.bold("Wallet"));
    if (balances.length === 0) {
      output.log("    No tokens found.");
    }
    for (const b of balances) {
      const sym = b.tokenMetadata?.symbol || b.symbol || "???";
      const dec = b.tokenMetadata?.decimals ?? b.decimals ?? 18;
      const bal = formatBalance(b.tokenBalance, dec);
      const price = b.tokenPrices?.[0]?.value ?? "-";
      output.log(`    ${sym.padEnd(8)} ${bal.padStart(18)}    $${price}`);
    }
    output.log("");

    // Jobs
    output.log("  " + output.colors.bold("Jobs"));
    output.field("Active", String(data.activeJobs));
    output.field("Completed", String(data.completedJobs));
    output.field("Offerings", String(data.offerings));
    output.log("");

    // Token
    if (data.tokenAddress) {
      output.log("  " + output.colors.bold("Token"));
      output.field("Symbol", data.token?.symbol || "-");
      output.field("Address", data.tokenAddress);
      output.log("");
    }

    // Offerings detail
    if (data.agent?.jobs?.length) {
      output.log("  " + output.colors.bold("Your Offerings"));
      for (const j of data.agent.jobs) {
        const price = j.priceV2 ? formatPrice(j.priceV2.value, j.priceV2.type) : "-";
        output.log(`    ${j.name.padEnd(30)} ${price}`);
      }
      output.log("");
    }

    output.log(
      "  " +
        output.colors.dim("Use 'nexus dashboard earnings' or 'nexus dashboard jobs' for details.")
    );
    output.log("");
  });
}

export async function earnings(): Promise<void> {
  let balances: WalletBalance[] = [];
  let completedJobs: any[] = [];

  try {
    const { data } = await client.get("/acp/wallet-balances");
    balances = data?.data ?? [];
  } catch {
    /* Non-fatal */
  }

  try {
    const { data } = await client.get("/acp/jobs/completed");
    completedJobs = data?.data ?? data ?? [];
  } catch {
    /* Non-fatal */
  }

  const earningsAsProvider = completedJobs.filter(
    (j: any) => j.role === "provider" || j.providerAddress
  );
  const spentAsBuyer = completedJobs.filter((j: any) => j.role === "client" || j.clientAddress);

  output.output(
    {
      balances,
      completedJobs: completedJobs.length,
      earned: earningsAsProvider.length,
      spent: spentAsBuyer.length,
    },
    (data) => {
      output.heading("Earnings Dashboard");

      output.log("");
      output.log("  " + output.colors.bold("Wallet Balances"));
      for (const b of balances) {
        const sym = b.tokenMetadata?.symbol || b.symbol || "???";
        const dec = b.tokenMetadata?.decimals ?? b.decimals ?? 18;
        const bal = formatBalance(b.tokenBalance, dec);
        output.log(`    ${sym.padEnd(8)} ${bal.padStart(18)}`);
      }

      output.log("");
      output.log("  " + output.colors.bold("Job Summary"));
      output.field("Total Completed", String(completedJobs.length));
      output.field("As Provider", String(earningsAsProvider.length));
      output.field("As Client", String(spentAsBuyer.length));
      output.log("");
    }
  );
}

export async function jobs(): Promise<void> {
  let activeJobs: any[] = [];
  let completedJobs: any[] = [];

  try {
    const { data } = await client.get("/acp/jobs/active");
    activeJobs = data?.data ?? data ?? [];
  } catch {
    /* Non-fatal */
  }

  try {
    const { data } = await client.get("/acp/jobs/completed");
    completedJobs = data?.data ?? data ?? [];
  } catch {
    /* Non-fatal */
  }

  output.output({ activeJobs, completedJobs }, () => {
    output.heading("Job Dashboard");

    if (activeJobs.length) {
      output.log("");
      output.log("  " + output.colors.bold("Active Jobs"));
      for (const j of activeJobs) {
        const price = j.price != null ? formatPrice(j.price, j.priceType) : "-";
        output.log(
          `    [${j.id}] ${(j.phase || "").padEnd(15)} ${price.padEnd(12)} ${j.providerAddress || j.clientAddress || ""}`
        );
      }
    } else {
      output.log("\n  No active jobs.");
    }

    if (completedJobs.length) {
      output.log("");
      output.log("  " + output.colors.bold(`Completed Jobs (${completedJobs.length})`));
      for (const j of completedJobs.slice(0, 10)) {
        const price = j.price != null ? formatPrice(j.price, j.priceType) : "-";
        output.log(
          `    [${j.id}] ${price.padEnd(12)} ${j.providerAddress || j.clientAddress || ""}`
        );
      }
      if (completedJobs.length > 10) {
        output.log(`    ... and ${completedJobs.length - 10} more`);
      }
    }
    output.log("");
  });
}
