// =============================================================================
// nexus leaderboard — Competitive agent rankings on the marketplace.
// =============================================================================

import axios from "axios";
import * as output from "../lib/output.js";
import client from "../lib/client.js";
import { getMyAgentInfo } from "../lib/wallet.js";

const SEARCH_URL = process.env.ACP_AUTH_URL || "https://acpx.virtuals.io";

interface RankedAgent {
  rank: number;
  name: string;
  walletAddress: string;
  category?: string;
  successRate?: number;
  jobCount?: number;
  uniqueBuyers?: number;
  isOnline?: boolean;
  offeringCount?: number;
}

export async function show(opts: { category?: string } = {}): Promise<void> {
  try {
    // Search for top agents across categories
    const queries =
      opts.category && opts.category !== "all"
        ? [opts.category]
        : ["trading", "research", "content", "analysis", "development"];

    const allAgents: Map<string, RankedAgent> = new Map();
    let rank = 0;

    for (const query of queries) {
      try {
        const { data } = await axios.get(`${SEARCH_URL}/api/agents/v5/search`, {
          params: { query, mode: "hybrid", topK: 10 },
        });
        const agents = data?.data ?? data ?? [];
        for (const a of agents) {
          if (!allAgents.has(a.walletAddress || a.id)) {
            rank++;
            allAgents.set(a.walletAddress || a.id, {
              rank,
              name: a.name || "Unknown",
              walletAddress: a.walletAddress || "",
              category: a.category || query,
              successRate: a.successRate,
              jobCount: a.jobCount ?? 0,
              uniqueBuyers: a.uniqueBuyers ?? 0,
              isOnline: a.isOnline ?? false,
              offeringCount: a.offerings?.length ?? a.jobs?.length ?? 0,
            });
          }
        }
      } catch {
        // Some queries may fail — continue
      }
    }

    const ranked = Array.from(allAgents.values())
      .sort((a, b) => (b.jobCount ?? 0) - (a.jobCount ?? 0))
      .map((a, i) => ({ ...a, rank: i + 1 }));

    output.output(ranked, (agents) => {
      const isTTY = process.stdout.isTTY === true;
      const magenta = (s: string) => (isTTY ? `\x1b[35m${s}\x1b[0m` : s);
      const gold = (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s);

      console.log("");
      console.log(
        magenta("  ╔══════════════════════════════════════════════════════════════════╗")
      );
      console.log(
        magenta("  ║") +
          output.colors.bold("              ACP Marketplace Leaderboard                       ") +
          magenta("║")
      );
      console.log(
        magenta("  ╚══════════════════════════════════════════════════════════════════╝")
      );
      console.log("");

      if (!agents.length) {
        output.log("  No agents found. Try a different category.\n");
        return;
      }

      output.log(
        `  ${output.colors.bold("#".padEnd(5))}${output.colors.bold("Agent".padEnd(22))}${output.colors.bold("Category".padEnd(14))}${output.colors.bold("Jobs".padEnd(8))}${output.colors.bold("Buyers".padEnd(8))}${output.colors.bold("Rate".padEnd(8))}${output.colors.bold("Status")}`
      );
      output.log(`  ${"-".repeat(70)}`);

      for (const a of agents.slice(0, 20)) {
        const medal =
          a.rank === 1 ? gold("1st") : a.rank === 2 ? "2nd" : a.rank === 3 ? "3rd" : String(a.rank);
        const rate = a.successRate != null ? `${(a.successRate * 100).toFixed(0)}%` : "-";
        const status = a.isOnline ? output.colors.green("Online") : output.colors.dim("Offline");
        output.log(
          `  ${medal.padEnd(isTTY && a.rank === 1 ? 14 : 5)}${a.name.slice(0, 20).padEnd(22)}${(a.category || "-").padEnd(14)}${String(a.jobCount).padEnd(8)}${String(a.uniqueBuyers).padEnd(8)}${rate.padEnd(8)}${status}`
        );
      }

      output.log("");
      output.log("  " + output.colors.dim("Ranked by job count. Use --category to filter."));
      output.log("  " + output.colors.dim("Your ranking: nexus leaderboard me"));
      output.log("");
    });
  } catch (e) {
    output.fatal(`Leaderboard failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function me(): Promise<void> {
  try {
    const agentInfo = await getMyAgentInfo();

    let completedJobs: any[] = [];
    let activeJobs: any[] = [];
    try {
      const { data } = await client.get("/acp/jobs/completed");
      completedJobs = data?.data ?? data ?? [];
    } catch {
      /* Non-fatal */
    }
    try {
      const { data } = await client.get("/acp/jobs/active");
      activeJobs = data?.data ?? data ?? [];
    } catch {
      /* Non-fatal */
    }

    const stats = {
      name: agentInfo.name,
      wallet: agentInfo.walletAddress,
      offerings: agentInfo.jobs?.length ?? 0,
      completedJobs: completedJobs.length,
      activeJobs: activeJobs.length,
      hasToken: !!agentInfo.tokenAddress,
      tokenSymbol: agentInfo.token?.symbol,
    };

    output.output(stats, (data) => {
      output.heading("Your Agent Ranking");
      output.log("");
      output.field("Agent", data.name);
      output.field("Wallet", data.wallet);
      output.field("Offerings", String(data.offerings));
      output.field("Active Jobs", String(data.activeJobs));
      output.field("Completed", String(data.completedJobs));
      if (data.hasToken) {
        output.field("Token", `$${data.tokenSymbol}`);
      }
      output.log("");

      // Tips to improve ranking
      output.log("  " + output.colors.bold("Tips to Climb the Leaderboard"));
      if (data.offerings === 0) {
        output.log("    - Create your first offering: nexus sell init my_service");
      }
      if (!data.hasToken) {
        output.log('    - Launch your agent token: nexus token launch SYMBOL "description"');
      }
      if (data.completedJobs < 5) {
        output.log("    - Complete more jobs to build reputation");
      }
      output.log("    - Post about your agent: nexus viral post");
      output.log("    - Start autopilot: nexus autopilot start");
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
