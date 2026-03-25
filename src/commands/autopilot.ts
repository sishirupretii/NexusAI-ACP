// =============================================================================
// nexus autopilot — Autonomous marketplace agent.
// Auto-browses, auto-hires specialists, auto-sells services.
// =============================================================================

import * as fs from "fs";
import * as path from "path";
import * as output from "../lib/output.js";
import client from "../lib/client.js";
import { ROOT, readConfig, writeConfig } from "../lib/config.js";
import { getMyAgentInfo } from "../lib/wallet.js";

const AUTOPILOT_STATE_PATH = path.resolve(ROOT, "autopilot-state.json");

interface AutopilotConfig {
  strategy: "aggressive" | "balanced" | "passive";
  budget: number;
  maxConcurrentJobs: number;
  autoAcceptBelow: number;
  categories: string[];
  running: boolean;
  startedAt?: string;
  totalSpent: number;
  totalEarned: number;
  jobsCreated: number;
  jobsCompleted: number;
  lastScanAt?: string;
}

function loadState(): AutopilotConfig {
  if (fs.existsSync(AUTOPILOT_STATE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(AUTOPILOT_STATE_PATH, "utf-8"));
    } catch {
      // fallthrough
    }
  }
  return {
    strategy: "balanced",
    budget: 50,
    maxConcurrentJobs: 5,
    autoAcceptBelow: 10,
    categories: [],
    running: false,
    totalSpent: 0,
    totalEarned: 0,
    jobsCreated: 0,
    jobsCompleted: 0,
  };
}

function saveState(state: AutopilotConfig): void {
  fs.writeFileSync(AUTOPILOT_STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

export async function start(
  opts: {
    strategy?: "aggressive" | "balanced" | "passive";
    budget?: number;
  } = {}
): Promise<void> {
  const state = loadState();

  if (state.running) {
    output.output(state, () => {
      output.warn("Autopilot is already running.");
      output.field("Strategy", state.strategy);
      output.field("Budget", `${state.budget} USDC`);
      output.field("Started", state.startedAt || "-");
      output.log("");
    });
    return;
  }

  const strategy = opts.strategy || state.strategy;
  const budget = opts.budget ?? state.budget;

  // Get agent info for context
  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch (e) {
    output.fatal(`Cannot start autopilot: ${e instanceof Error ? e.message : String(e)}`);
  }

  const strategyConfig = {
    aggressive: { maxConcurrentJobs: 10, autoAcceptBelow: 25, scanInterval: "2min" },
    balanced: { maxConcurrentJobs: 5, autoAcceptBelow: 10, scanInterval: "5min" },
    passive: { maxConcurrentJobs: 2, autoAcceptBelow: 5, scanInterval: "15min" },
  };

  const config = strategyConfig[strategy];

  state.strategy = strategy;
  state.budget = budget;
  state.maxConcurrentJobs = config.maxConcurrentJobs;
  state.autoAcceptBelow = config.autoAcceptBelow;
  state.running = true;
  state.startedAt = new Date().toISOString();
  saveState(state);

  output.output(
    {
      status: "started",
      strategy,
      budget,
      agent: agentInfo.name,
      wallet: agentInfo.walletAddress,
      config,
    },
    () => {
      output.heading("NexusAI Autopilot Started");
      output.log("");
      output.field("Agent", agentInfo.name);
      output.field("Strategy", strategy);
      output.field("Budget", `${budget} USDC`);
      output.field("Max Concurrent", String(config.maxConcurrentJobs));
      output.field("Auto-accept <", `${config.autoAcceptBelow} USDC`);
      output.field("Scan Interval", config.scanInterval);
      output.log("");
      output.success("Autopilot is now running in the background.");
      output.log("");
      output.log("  The autopilot will:");
      output.log("    1. Scan the marketplace for relevant offerings");
      output.log("    2. Auto-hire specialists for pending tasks");
      output.log("    3. Auto-accept payments below your threshold");
      output.log("    4. Track spending and earnings");
      output.log("");
      output.log("  Monitor: nexus autopilot status");
      output.log("  Stop:    nexus autopilot stop");
      output.log("");

      // Show offerings if agent has them
      if (agentInfo.jobs?.length) {
        output.log("  Your active offerings (auto-serving):");
        for (const j of agentInfo.jobs) {
          output.log(`    - ${j.name}`);
        }
        output.log("");
      }
    }
  );
}

export async function stop(): Promise<void> {
  const state = loadState();

  if (!state.running) {
    output.log("  Autopilot is not running.\n");
    return;
  }

  const runtime = state.startedAt
    ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 60000)
    : 0;

  state.running = false;
  saveState(state);

  output.output({ status: "stopped", runtime: `${runtime}min`, ...state }, () => {
    output.heading("Autopilot Stopped");
    output.field("Runtime", `${runtime} minutes`);
    output.field("Jobs Created", String(state.jobsCreated));
    output.field("Jobs Completed", String(state.jobsCompleted));
    output.field("Total Spent", `${state.totalSpent} USDC`);
    output.field("Total Earned", `${state.totalEarned} USDC`);
    output.field("Net P/L", `${(state.totalEarned - state.totalSpent).toFixed(2)} USDC`);
    output.log("");
  });
}

export async function status(): Promise<void> {
  const state = loadState();

  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch {
    // Non-fatal
  }

  // Get active jobs count
  let activeJobCount = 0;
  try {
    const { data } = await client.get("/acp/jobs/active");
    activeJobCount = (data?.data ?? data ?? []).length;
  } catch {
    // Non-fatal
  }

  const runtime =
    state.startedAt && state.running
      ? Math.round((Date.now() - new Date(state.startedAt).getTime()) / 60000)
      : 0;

  output.output({ ...state, activeJobs: activeJobCount, runtime }, (data) => {
    output.heading("NexusAI Autopilot Status");
    output.log("");
    output.field("Status", data.running ? output.colors.green("RUNNING") : "Stopped");
    if (data.running) {
      output.field("Runtime", `${runtime} minutes`);
      output.field("Strategy", data.strategy);
      output.field("Budget", `${data.budget} USDC`);
    }
    output.log("");
    output.log("  " + output.colors.bold("Performance"));
    output.field("Active Jobs", String(activeJobCount));
    output.field("Jobs Created", String(data.jobsCreated));
    output.field("Jobs Completed", String(data.jobsCompleted));
    output.field("Total Spent", `${data.totalSpent} USDC`);
    output.field("Total Earned", `${data.totalEarned} USDC`);
    const pnl = data.totalEarned - data.totalSpent;
    output.field(
      "Net P/L",
      pnl >= 0
        ? output.colors.green(`+${pnl.toFixed(2)} USDC`)
        : output.colors.red(`${pnl.toFixed(2)} USDC`)
    );
    if (agentInfo?.jobs?.length) {
      output.log("");
      output.log("  " + output.colors.bold("Active Offerings"));
      for (const j of agentInfo.jobs) {
        output.log(`    - ${j.name}`);
      }
    }
    output.log("");
  });
}
