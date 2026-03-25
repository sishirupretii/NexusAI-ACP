#!/usr/bin/env npx tsx
// =============================================================================
// nexus — NexusAI Claw: The Ultimate ACP Toolkit for Virtuals Protocol
//
// Extends the standard ACP CLI with:
//   - autopilot    Auto-browse, auto-hire, auto-sell on the marketplace
//   - dashboard    Revenue, jobs, agents overview at a glance
//   - swarm        Multi-agent coordination and management
//   - viral        Auto-post achievements and milestones to Twitter/X
//   - leaderboard  Competitive agent rankings
//   - skill        Install offerings/skills from GitHub repos
//
// Usage:  nexus <command> [subcommand] [args] [flags]
// =============================================================================

import { createRequire } from "module";
import { setJsonMode } from "../src/lib/output.js";
import { requireApiKey } from "../src/lib/config.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json");

// -- Arg parsing helpers --

function hasFlag(args: string[], ...flags: string[]): boolean {
  return args.some((a) => flags.includes(a));
}

function removeFlags(args: string[], ...flags: string[]): string[] {
  return args.filter((a) => !flags.includes(a));
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  const prefix = flag + "=";
  const eq = args.find((a) => typeof a === "string" && a.startsWith(prefix));
  if (eq) return eq.slice(prefix.length);
  return undefined;
}

function removeFlagWithValue(args: string[], flag: string): string[] {
  const idx = args.indexOf(flag);
  if (idx !== -1) return [...args.slice(0, idx), ...args.slice(idx + 2)];
  return args;
}

// -- Help text --

const isTTY = process.stdout.isTTY === true;
const bold = (s: string) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s);
const dim = (s: string) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s);
const cyan = (s: string) => (isTTY ? `\x1b[36m${s}\x1b[0m` : s);
const yellow = (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s);
const magenta = (s: string) => (isTTY ? `\x1b[35m${s}\x1b[0m` : s);
const green = (s: string) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s);

function cmd(command: string, desc: string, indent = 2): string {
  const pad = 43 - indent;
  return `${" ".repeat(indent)}${bold(command.padEnd(pad))}${dim(desc)}`;
}

function flag(name: string, desc: string): string {
  return `${" ".repeat(4)}${yellow(name.padEnd(41))}${dim(desc)}`;
}

function section(title: string): string {
  return `  ${cyan(title)}`;
}

function buildHelp(): string {
  const logo = [
    "",
    magenta("    _   __                     ___    ____   ________                "),
    magenta("   / | / /__  _  ____  _______/   |  /  _/  / ____/ /___ __      __ "),
    magenta("  /  |/ / _ \\| |/_/ / / / ___/ /| |  / /   / /   / / __ `/ | /| / / "),
    magenta(" / /|  /  __/>  </ /_/ (__  ) ___ |_/ /   / /___/ / /_/ /| |/ |/ /  "),
    magenta("/_/ |_/\\___/_/|_|\\__,_/____/_/  |_/___/   \\____/_/\\__,_/ |__/|__/   "),
    "",
    `  ${bold("NexusAI Claw")} ${dim("v" + VERSION)} ${dim("— The Ultimate ACP Toolkit for Virtuals Protocol")}`,
    "",
  ];

  const lines = [
    ...logo,
    `  ${dim("Usage:")}  ${bold("nexus")} ${dim("<command> [subcommand] [args] [flags]")}`,
    "",
    section("NexusAI Exclusive"),
    cmd("autopilot start", "Start autopilot (auto-browse, hire, sell)"),
    cmd("autopilot stop", "Stop autopilot"),
    cmd("autopilot status", "Show autopilot status"),
    flag("--strategy <aggressive|balanced|passive>", "Trading strategy"),
    flag("--budget <amount>", "Max spend per job (USDC)"),
    "",
    cmd("dashboard", "Full revenue & activity dashboard"),
    cmd("dashboard earnings", "Earnings breakdown"),
    cmd("dashboard jobs", "Job statistics"),
    "",
    cmd("swarm create <name> <count>", "Spawn a swarm of agents"),
    cmd("swarm status", "Show all swarm agents"),
    cmd("swarm broadcast <message>", "Send task to all swarm agents"),
    cmd("swarm destroy <name>", "Destroy a swarm"),
    "",
    cmd("viral post", "Auto-generate & post viral tweet"),
    cmd("viral campaign <topic>", "Start a viral campaign"),
    cmd("viral stats", "Show viral reach & engagement"),
    flag("--hashtags <csv>", "Custom hashtags"),
    "",
    cmd("leaderboard", "Show top agents on marketplace"),
    cmd("leaderboard me", "Show your ranking"),
    flag("--category <all|trading|research|...>", "Filter by category"),
    "",
    cmd("skill install <github-url>", "Install offering from GitHub"),
    cmd("skill list", "List installed skills"),
    cmd("skill remove <name>", "Remove an installed skill"),
    "",
    section("Standard ACP Commands"),
    cmd("setup", "Interactive setup (login + create agent)"),
    cmd("login", "Re-authenticate session"),
    cmd("whoami", "Show current agent profile summary"),
    "",
    cmd("wallet address", "Get agent wallet address"),
    cmd("wallet balance", "Get all token balances"),
    cmd("wallet topup", "Get topup URL to add funds"),
    "",
    cmd("browse <query>", "Browse agents on the marketplace"),
    cmd("job create <wallet> <offering>", "Start a job with an agent"),
    cmd("job status <job-id>", "Check job status"),
    cmd("job pay <job-id>", "Accept or reject payment"),
    cmd("job active", "List active jobs"),
    cmd("job completed", "List completed jobs"),
    "",
    cmd("token launch <symbol> <desc>", "Launch agent token"),
    cmd("token info", "Get agent token details"),
    "",
    cmd("profile show", "Show full agent profile"),
    cmd("profile update <key> <value>", "Update agent profile"),
    "",
    cmd("sell init <name>", "Scaffold a new offering"),
    cmd("sell create <name>", "Register offering on ACP"),
    cmd("sell list", "Show all offerings"),
    cmd("serve start", "Start the seller runtime"),
    cmd("serve stop", "Stop the seller runtime"),
    "",
    cmd("social twitter login", "Authenticate Twitter/X"),
    cmd("social twitter post <text>", "Post a tweet"),
    cmd("social twitter search <query>", "Search tweets"),
    "",
    cmd("bounty create", "Create a new bounty"),
    cmd("bounty poll", "Poll active bounties"),
    cmd("bounty select <id>", "Select a candidate"),
    "",
    section("Cloud Deployment"),
    cmd("serve deploy railway", "Deploy to Railway"),
    cmd("serve deploy railway setup", "First-time setup"),
    "",
    section("Flags"),
    flag("--json", "Output raw JSON (for agents/scripts)"),
    flag("--help, -h", "Show this help"),
    flag("--version, -v", "Show version"),
    "",
    `  ${dim("Full ACP docs:")} ${cyan("nexus --help")} ${dim("or")} ${cyan("acp --help")}`,
    `  ${dim("GitHub:")} ${cyan("https://github.com/sishirupretii/NexusAI-ACP")}`,
    `  ${dim("Virtuals:")} ${cyan("https://app.virtuals.io/acp")}`,
    "",
  ];
  return lines.join("\n");
}

// -- Main --

async function main(): Promise<void> {
  let args = process.argv.slice(2);

  const jsonFlag = hasFlag(args, "--json") || process.env.ACP_JSON === "1";
  if (jsonFlag) setJsonMode(true);
  args = removeFlags(args, "--json");

  if (hasFlag(args, "--version", "-v")) {
    console.log(`NexusAI Claw v${VERSION}`);
    return;
  }

  if (args.length === 0 || hasFlag(args, "--help", "-h")) {
    console.log(buildHelp());
    return;
  }

  const [command, subcommand, ...rest] = args;

  // -- NexusAI Exclusive commands --

  if (command === "autopilot") {
    requireApiKey();
    const autopilot = await import("../src/commands/autopilot.js");
    if (subcommand === "start") {
      const strategy = getFlagValue(rest, "--strategy") as
        | "aggressive"
        | "balanced"
        | "passive"
        | undefined;
      const budgetStr = getFlagValue(rest, "--budget");
      const budget = budgetStr ? parseFloat(budgetStr) : undefined;
      return autopilot.start({ strategy, budget });
    }
    if (subcommand === "stop") return autopilot.stop();
    if (subcommand === "status") return autopilot.status();
    console.log(buildHelp());
    return;
  }

  if (command === "dashboard") {
    requireApiKey();
    const dashboard = await import("../src/commands/dashboard.js");
    if (!subcommand || subcommand === "overview") return dashboard.overview();
    if (subcommand === "earnings") return dashboard.earnings();
    if (subcommand === "jobs") return dashboard.jobs();
    console.log(buildHelp());
    return;
  }

  if (command === "swarm") {
    requireApiKey();
    const swarm = await import("../src/commands/swarm.js");
    if (subcommand === "create") {
      const name = rest[0];
      const count = rest[1] ? parseInt(rest[1], 10) : 3;
      return swarm.create(name, count);
    }
    if (subcommand === "status") return swarm.status();
    if (subcommand === "broadcast") {
      const message = rest.join(" ");
      return swarm.broadcast(message);
    }
    if (subcommand === "destroy") return swarm.destroy(rest[0]);
    console.log(buildHelp());
    return;
  }

  if (command === "viral") {
    requireApiKey();
    const viral = await import("../src/commands/viral.js");
    if (subcommand === "post") {
      const hashtags = getFlagValue(rest, "--hashtags");
      return viral.post({ hashtags });
    }
    if (subcommand === "campaign") {
      const topic = rest.join(" ");
      const hashtags = getFlagValue(rest, "--hashtags");
      return viral.campaign(topic, { hashtags });
    }
    if (subcommand === "stats") return viral.stats();
    console.log(buildHelp());
    return;
  }

  if (command === "leaderboard") {
    const leaderboard = await import("../src/commands/leaderboard.js");
    if (subcommand === "me") {
      requireApiKey();
      return leaderboard.me();
    }
    const category = getFlagValue([subcommand, ...rest].filter(Boolean), "--category");
    return leaderboard.show({ category });
  }

  if (command === "skill") {
    const skill = await import("../src/commands/skill.js");
    if (subcommand === "install") return skill.install(rest[0]);
    if (subcommand === "list") return skill.list();
    if (subcommand === "remove") return skill.remove(rest[0]);
    console.log(buildHelp());
    return;
  }

  // -- Delegate standard ACP commands to acp.ts logic --
  // Re-run as acp command
  const { spawn } = await import("child_process");
  const acpArgs = ["tsx", "bin/acp.ts", ...process.argv.slice(2)];
  const child = spawn("npx", acpArgs, {
    cwd: new URL("..", import.meta.url).pathname,
    stdio: "inherit",
    shell: false,
  });
  child.on("close", (code) => process.exit(code ?? 0));
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
