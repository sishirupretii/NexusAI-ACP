// =============================================================================
// nexus clawlancer — Browse, claim, and earn from Clawlancer bounties.
// Inspired by InstaClaw's Clawlancer integration.
// =============================================================================

import * as output from "../lib/output.js";
import client from "../lib/client.js";
import { getMyAgentInfo } from "../lib/wallet.js";
import * as fs from "fs";
import * as path from "path";
import { ROOT, readConfig } from "../lib/config.js";

const CLAWLANCER_STATE = path.resolve(ROOT, "clawlancer-state.json");

interface ClawlancerState {
  claimedBounties: ClaimedBounty[];
  totalEarned: number;
  completedCount: number;
  reputationScore: number;
  lastScan: string | null;
  autoClaimEnabled: boolean;
  skillFilters: string[];
}

interface ClaimedBounty {
  id: string;
  title: string;
  reward: number;
  currency: string;
  claimedAt: string;
  status: "in_progress" | "delivered" | "verified" | "paid";
  deliveredAt?: string;
}

function loadState(): ClawlancerState {
  if (fs.existsSync(CLAWLANCER_STATE)) {
    try {
      return JSON.parse(fs.readFileSync(CLAWLANCER_STATE, "utf-8"));
    } catch {
      // fallthrough
    }
  }
  return {
    claimedBounties: [],
    totalEarned: 0,
    completedCount: 0,
    reputationScore: 0,
    lastScan: null,
    autoClaimEnabled: false,
    skillFilters: [],
  };
}

function saveState(state: ClawlancerState): void {
  fs.writeFileSync(CLAWLANCER_STATE, JSON.stringify(state, null, 2) + "\n");
}

export async function browse(
  query?: string,
  opts: { category?: string; minReward?: number; maxReward?: number } = {}
): Promise<void> {
  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch (e) {
    output.fatal(`Cannot get agent info: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Search ACP marketplace for bounty-style offerings
  const params: Record<string, any> = {
    type: "hybrid",
    limit: 20,
  };
  if (query) params.q = query;

  let bounties: any[] = [];
  try {
    const { data } = await client.get("/acp/search/agents", { params });
    const agents = data?.data?.agents ?? data?.data ?? [];

    // Extract offerings that look like bounties/tasks
    for (const agent of agents) {
      const offerings = agent.jobOfferings ?? agent.offerings ?? [];
      for (const off of offerings) {
        const reward =
          off.priceV2?.value ??
          off.price ??
          (typeof off.requiredFunds === "number" ? off.requiredFunds : 0);
        if (opts.minReward && reward < opts.minReward) continue;
        if (opts.maxReward && reward > opts.maxReward) continue;

        bounties.push({
          id: off.id || `${agent.id}-${off.name}`,
          title: off.name,
          description: off.description,
          reward,
          currency: "USDC",
          agentName: agent.name,
          agentWallet: agent.walletAddress,
          category: off.category || "general",
          sla: off.slaMinutes || 60,
        });
      }
    }
  } catch (e) {
    output.fatal(`Failed to browse bounties: ${e instanceof Error ? e.message : String(e)}`);
  }

  output.output({ bounties, count: bounties.length }, () => {
    output.heading("Clawlancer Bounty Board");
    output.log("");
    if (!bounties.length) {
      output.log("  No bounties found. Try a different query.");
      output.log("");
      return;
    }

    output.log(
      `  Found ${output.colors.bold(String(bounties.length))} bounties${query ? ` matching "${query}"` : ""}:\n`
    );

    for (let i = 0; i < bounties.length; i++) {
      const b = bounties[i];
      const reward = output.colors.green(`${b.reward} ${b.currency}`);
      output.log(`  ${output.colors.bold(`[${i + 1}]`)} ${b.title}`);
      output.log(`      Agent: ${b.agentName}  |  Reward: ${reward}  |  SLA: ${b.sla}min`);
      if (b.description) {
        output.log(`      ${output.colors.dim(b.description.slice(0, 80))}`);
      }
      output.log("");
    }

    output.log("  Claim a bounty:");
    output.log("    nexus clawlancer claim <bounty-id>");
    output.log("");
  });
}

export async function claim(bountyId: string): Promise<void> {
  if (!bountyId) {
    output.fatal("Usage: nexus clawlancer claim <bounty-id>");
  }

  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch (e) {
    output.fatal(`Cannot get agent info: ${e instanceof Error ? e.message : String(e)}`);
  }

  const state = loadState();

  // Check if already claimed
  if (state.claimedBounties.find((b) => b.id === bountyId)) {
    output.warn(`Bounty ${bountyId} is already claimed.`);
    return;
  }

  // Create ACP job for this bounty
  try {
    const { data } = await client.post("/acp/jobs", {
      providerWalletAddress: agentInfo.walletAddress,
      jobName: `Clawlancer Bounty: ${bountyId}`,
      requirementValue: { bountyId, source: "clawlancer" },
    });

    const jobId = data?.data?.id;

    state.claimedBounties.push({
      id: bountyId,
      title: `Bounty ${bountyId}`,
      reward: 0,
      currency: "USDC",
      claimedAt: new Date().toISOString(),
      status: "in_progress",
    });
    saveState(state);

    output.output({ bountyId, jobId, status: "claimed" }, () => {
      output.success(`Bounty claimed: ${bountyId}`);
      if (jobId) output.field("ACP Job ID", String(jobId));
      output.field("Status", "in_progress");
      output.log("");
      output.log("  Next steps:");
      output.log("    1. Complete the work described in the bounty");
      output.log(`    2. Deliver: nexus clawlancer deliver ${bountyId}`);
      output.log("    3. Payment releases after verification");
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to claim bounty: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function deliver(bountyId: string, resultText?: string): Promise<void> {
  if (!bountyId) {
    output.fatal("Usage: nexus clawlancer deliver <bounty-id> [result]");
  }

  const state = loadState();
  const bounty = state.claimedBounties.find((b) => b.id === bountyId);

  if (!bounty) {
    output.fatal(`Bounty ${bountyId} not found in claimed bounties.`);
  }

  bounty.status = "delivered";
  bounty.deliveredAt = new Date().toISOString();
  saveState(state);

  output.output({ bountyId, status: "delivered", result: resultText }, () => {
    output.success(`Bounty delivered: ${bountyId}`);
    output.field("Status", "delivered — awaiting verification");
    output.log("");
    output.log("  Payment will be released to your wallet after verification.");
    output.log("");
  });
}

export async function myBounties(): Promise<void> {
  const state = loadState();

  output.output(
    {
      bounties: state.claimedBounties,
      totalEarned: state.totalEarned,
      completedCount: state.completedCount,
      reputationScore: state.reputationScore,
    },
    () => {
      output.heading("My Clawlancer Bounties");
      output.log("");

      if (!state.claimedBounties.length) {
        output.log("  No claimed bounties yet.");
        output.log("  Browse: nexus clawlancer browse");
        output.log("");
        return;
      }

      for (const b of state.claimedBounties) {
        const statusColor =
          b.status === "paid"
            ? output.colors.green
            : b.status === "delivered"
              ? output.colors.yellow
              : output.colors.dim;
        output.log(
          `  [${b.id}] ${b.title}  ${statusColor(b.status)}  ${b.reward > 0 ? `${b.reward} ${b.currency}` : ""}`
        );
      }

      output.log("");
      output.field("Total Earned", `${state.totalEarned} USDC`);
      output.field("Completed", String(state.completedCount));
      output.field("Reputation", String(state.reputationScore));
      output.log("");
    }
  );
}

export async function autoClaim(opts: { enable?: boolean; filters?: string } = {}): Promise<void> {
  const state = loadState();

  if (opts.enable !== undefined) {
    state.autoClaimEnabled = opts.enable;
    if (opts.filters) {
      state.skillFilters = opts.filters.split(",").map((f) => f.trim());
    }
    saveState(state);
  }

  output.output({ autoClaimEnabled: state.autoClaimEnabled, filters: state.skillFilters }, () => {
    output.heading("Clawlancer Auto-Claim");
    output.log("");
    output.field("Status", state.autoClaimEnabled ? output.colors.green("ENABLED") : "Disabled");
    if (state.skillFilters.length) {
      output.field("Skill Filters", state.skillFilters.join(", "));
    }
    output.log("");
    output.log("  Enable:  nexus clawlancer auto-claim --enable");
    output.log("  Disable: nexus clawlancer auto-claim --disable");
    output.log('  Filter:  nexus clawlancer auto-claim --enable --filters "coding,research"');
    output.log("");
  });
}
