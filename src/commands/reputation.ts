// =============================================================================
// nexus reputation — On-chain reputation scoring and management.
// Tracks agent performance, reliability, and trust metrics.
// =============================================================================

import * as output from "../lib/output.js";
import client from "../lib/client.js";
import { getMyAgentInfo } from "../lib/wallet.js";
import * as fs from "fs";
import * as path from "path";
import { ROOT } from "../lib/config.js";

const REP_STATE = path.resolve(ROOT, "reputation-state.json");

interface ReputationState {
  score: number;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  jobsCompleted: number;
  jobsFailed: number;
  avgDeliveryTime: number;
  avgRating: number;
  totalEarned: number;
  streakDays: number;
  lastUpdated: string | null;
  badges: string[];
}

function loadState(): ReputationState {
  if (fs.existsSync(REP_STATE)) {
    try {
      return JSON.parse(fs.readFileSync(REP_STATE, "utf-8"));
    } catch {
      // fallthrough
    }
  }
  return {
    score: 0,
    tier: "bronze",
    jobsCompleted: 0,
    jobsFailed: 0,
    avgDeliveryTime: 0,
    avgRating: 0,
    totalEarned: 0,
    streakDays: 0,
    lastUpdated: null,
    badges: [],
  };
}

function saveState(state: ReputationState): void {
  fs.writeFileSync(REP_STATE, JSON.stringify(state, null, 2) + "\n");
}

function calculateTier(score: number): ReputationState["tier"] {
  if (score >= 900) return "diamond";
  if (score >= 700) return "platinum";
  if (score >= 500) return "gold";
  if (score >= 250) return "silver";
  return "bronze";
}

const TIER_ICONS: Record<string, string> = {
  bronze: "B",
  silver: "S",
  gold: "G",
  platinum: "P",
  diamond: "D",
};

const TIER_COLORS: Record<string, (s: string) => string> = {
  bronze: output.colors.dim,
  silver: output.colors.white,
  gold: output.colors.yellow,
  platinum: output.colors.cyan,
  diamond: output.colors.magenta,
};

export async function show(): Promise<void> {
  const state = loadState();

  // Fetch live data to update reputation
  let completedJobs: any[] = [];
  let activeJobs: any[] = [];
  try {
    const { data } = await client.get("/acp/jobs/completed");
    completedJobs = data?.data ?? data ?? [];
  } catch {
    // Non-fatal
  }
  try {
    const { data } = await client.get("/acp/jobs/active");
    activeJobs = data?.data ?? data ?? [];
  } catch {
    // Non-fatal
  }

  // Recalculate score from live data
  state.jobsCompleted = completedJobs.length;
  const baseScore = completedJobs.length * 10;
  const reliabilityBonus = state.jobsFailed === 0 ? 50 : 0;
  const streakBonus = state.streakDays * 2;
  state.score = Math.min(1000, baseScore + reliabilityBonus + streakBonus);
  state.tier = calculateTier(state.score);
  state.lastUpdated = new Date().toISOString();

  // Auto-award badges
  if (completedJobs.length >= 1 && !state.badges.includes("first_job")) {
    state.badges.push("first_job");
  }
  if (completedJobs.length >= 10 && !state.badges.includes("10_jobs")) {
    state.badges.push("10_jobs");
  }
  if (completedJobs.length >= 100 && !state.badges.includes("100_jobs")) {
    state.badges.push("100_jobs");
  }
  if (state.streakDays >= 7 && !state.badges.includes("week_streak")) {
    state.badges.push("week_streak");
  }

  saveState(state);

  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch {
    // Non-fatal
  }

  output.output(
    {
      ...state,
      agent: agentInfo?.name,
      wallet: agentInfo?.walletAddress,
    },
    () => {
      const tierColor = TIER_COLORS[state.tier] || output.colors.dim;
      const tierIcon = TIER_ICONS[state.tier] || "?";

      output.heading("Agent Reputation");
      output.log("");

      // Score display
      const bar = buildBar(state.score, 1000, 30);
      output.log(`  ${output.colors.bold("Score:")} ${state.score}/1000  ${bar}`);
      output.log(
        `  ${output.colors.bold("Tier:")}  ${tierColor(`[${tierIcon}] ${state.tier.toUpperCase()}`)}`
      );
      output.log("");

      // Stats
      output.log("  " + output.colors.bold("Performance"));
      output.field("Agent", agentInfo?.name || "-");
      output.field("Jobs Completed", String(state.jobsCompleted));
      output.field("Jobs Failed", String(state.jobsFailed));
      output.field(
        "Success Rate",
        state.jobsCompleted + state.jobsFailed > 0
          ? `${((state.jobsCompleted / (state.jobsCompleted + state.jobsFailed)) * 100).toFixed(1)}%`
          : "N/A"
      );
      output.field("Active Streak", `${state.streakDays} days`);
      output.field("Total Earned", `${state.totalEarned} USDC`);
      output.log("");

      // Badges
      if (state.badges.length) {
        output.log("  " + output.colors.bold("Badges"));
        const badgeLabels: Record<string, string> = {
          first_job: "First Job",
          "10_jobs": "10 Jobs",
          "100_jobs": "Centurion",
          week_streak: "7-Day Streak",
        };
        for (const badge of state.badges) {
          output.log(`    [*] ${badgeLabels[badge] || badge}`);
        }
        output.log("");
      }

      // Tier benefits
      output.log("  " + output.colors.bold("Tier Benefits"));
      output.log(`    Bronze:   Base marketplace access`);
      output.log(`    Silver:   Priority bounty matching`);
      output.log(`    Gold:     Higher-value bounties unlocked`);
      output.log(`    Platinum: Featured agent listing`);
      output.log(`    Diamond:  Premium bounties + reduced fees`);
      output.log("");
    }
  );
}

function buildBar(current: number, max: number, width: number): string {
  const filled = Math.round((current / max) * width);
  const empty = width - filled;
  const isTTY = process.stdout.isTTY === true;
  const filledStr = "=".repeat(filled);
  const emptyStr = "-".repeat(empty);
  if (isTTY) {
    return `\x1b[32m[${filledStr}\x1b[0m\x1b[2m${emptyStr}]\x1b[0m`;
  }
  return `[${filledStr}${emptyStr}]`;
}

export async function history(): Promise<void> {
  let completedJobs: any[] = [];
  try {
    const { data } = await client.get("/acp/jobs/completed");
    completedJobs = data?.data ?? data ?? [];
  } catch {
    // Non-fatal
  }

  output.output({ jobs: completedJobs.slice(0, 20) }, () => {
    output.heading("Reputation History");
    output.log("");

    if (!completedJobs.length) {
      output.log("  No completed jobs yet. Complete jobs to build reputation.");
      output.log("");
      return;
    }

    output.log(`  Last ${Math.min(20, completedJobs.length)} completed jobs:\n`);
    for (const job of completedJobs.slice(0, 20)) {
      const price = job.price != null ? `${job.price} USDC` : "-";
      output.log(
        `  [${job.id}] ${(job.phase || "completed").padEnd(12)} ${price.padEnd(12)} +10 rep`
      );
    }
    output.log("");
  });
}
