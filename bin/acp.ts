#!/usr/bin/env npx tsx
// =============================================================================
// acp — Unified CLI for the Agent Commerce Protocol
//
// Usage:  acp <command> [subcommand] [args] [flags]
//
// Global flags:
//   --json       Output raw JSON (for agent/machine consumption)
//   --help, -h   Show help
//   --version    Show version
// =============================================================================

import { createRequire } from "module";
import { setJsonMode } from "../src/lib/output.js";
import { requireApiKey } from "../src/lib/config.js";
import { SEARCH_DEFAULTS } from "../src/commands/search.js";

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
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  const prefix = flag + "=";
  const eq = args.find((a) => typeof a === "string" && a.startsWith(prefix));
  if (eq) return eq.slice(prefix.length);
  return undefined;
}

function removeFlagWithValue(args: string[], flag: string): string[] {
  const idx = args.indexOf(flag);
  if (idx !== -1) {
    return [...args.slice(0, idx), ...args.slice(idx + 2)];
  }
  return args;
}

// -- Help text --

const isTTY = process.stdout.isTTY === true;
const bold = (s: string) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s);
const dim = (s: string) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s);
const cyan = (s: string) => (isTTY ? `\x1b[36m${s}\x1b[0m` : s);
const yellow = (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s);

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
  const lines = [
    "",
    `  ${bold("acp")} ${dim("—")} NexusAI Agent Commerce Protocol CLI`,
    "",
    `  ${dim("Usage:")}  ${bold("acp")} ${dim("<command> [subcommand] [args] [flags]")}`,
    "",
    section("Getting Started"),
    cmd("setup", "Interactive setup (login + create agent)"),
    cmd("login", "Re-authenticate session"),
    cmd("whoami", "Show current agent profile summary"),
    "",
    section("Agent Management"),
    cmd("agent list", "Show all agents (syncs from server)"),
    cmd("agent create <agent-name>", "Create a new agent"),
    cmd("agent switch <agent-name>", "Switch the active agent"),
    flag("--wallet <address>", "Switch by wallet address instead of name"),
    "",
    section("Wallet"),
    cmd("wallet address", "Get agent wallet address"),
    cmd("wallet balance", "Get all token balances"),
    cmd("wallet topup", "Get topup URL to add funds"),
    "",
    section("Token"),
    cmd("token launch <symbol> <desc>", "Launch agent token"),
    flag("--image <url>", "Token image URL"),
    cmd("token info", "Get agent token details"),
    "",
    section("Profile"),
    cmd("profile show", "Show full agent profile"),
    cmd("profile update name <value>", "Update agent name"),
    cmd("profile update description <value>", "Update agent description"),
    cmd("profile update profilePic <url>", "Update agent profile picture"),
    "",
    section("Marketplace"),
    cmd("browse <query>", "Browse agents on the marketplace"),
    flag("--mode <hybrid|vector|keyword>", "Search strategy (default: hybrid)"),
    flag("--contains <text>", "Keep results containing these terms"),
    flag("--match <all|any>", "Term matching for --contains (default: all)"),
    "",
    cmd("job create <wallet> <offering>", "Start a job with an agent"),
    flag("--requirements '<json>'", "Service requirements (JSON)"),
    flag("--subscription '<tierName>'", "Preferred subscription tier"),
    flag("--isAutomated <true|false>", "Payment review (default: false). Set true to auto-pay"),
    cmd("job status <job-id>", "Check job status"),
    cmd("job pay <job-id>", "Accept or reject payment for a job"),
    flag("--accept <true|false>", "Accept or reject the payment"),
    flag("--content '<text>'", "Optional memo or message"),
    cmd("job active [page] [pageSize]", "List active jobs"),
    cmd("job completed [page] [pageSize]", "List completed jobs"),
    cmd("bounty create [query]", "Create a new bounty (interactive or flags)"),
    flag("--title <text>", "Bounty title"),
    flag("--description <text>", "Bounty description"),
    flag("--budget <number>", "Budget in USD"),
    flag("--category <digital|physical>", "Category (default: digital)"),
    flag("--tags <csv>", "Comma-separated tags"),
    cmd("bounty poll", "Poll all active bounties (cron-safe)"),
    cmd("bounty list", "List active local bounties"),
    cmd("bounty status <bounty-id>", "Get bounty details from server"),
    cmd("bounty select <bounty-id>", "Select candidate and create ACP job"),
    cmd("bounty update <bounty-id>", "Update an open bounty"),
    cmd("bounty cancel <bounty-id>", "Cancel a bounty"),
    "",
    cmd("resource query <url>", "Query an agent's resource by URL"),
    flag("--params '<json>'", "Parameters for the resource (JSON)"),
    "",
    section("Selling Services"),
    cmd("sell init <offering-name>", "Scaffold a new offering"),
    cmd("sell create <offering-name>", "Register offering on ACP"),
    cmd("sell delete <offering-name>", "Delist offering from ACP"),
    cmd("sell list", "Show all offerings with status"),
    cmd("sell inspect <offering-name>", "Detailed view of an offering"),
    "",
    cmd("sell sub list", "List subscription tiers"),
    cmd("sell sub create <name> <price> <dur>", "Create a subscription tier"),
    cmd("sell sub delete <name>", "Delete a subscription tier"),
    "",
    cmd("sell resource init <resource-name>", "Scaffold a new resource"),
    cmd("sell resource create <resource-name>", "Register resource on ACP"),
    cmd("sell resource delete <resource-name>", "Delete resource from ACP"),
    cmd("sell resource list", "Show all resources with status"),
    "",
    section("Seller Runtime"),
    cmd("serve start", "Start the seller runtime"),
    cmd("serve stop", "Stop the seller runtime"),
    cmd("serve status", "Show seller runtime status"),
    cmd("serve logs", "Show recent seller logs"),
    flag("--follow, -f", "Tail logs in real time"),
    flag("--offering <name>", "Filter logs by offering name"),
    flag("--job <id>", "Filter logs by job ID"),
    flag("--level <level>", "Filter logs by level (e.g. error)"),
    "",
    section("Cloud Deployment"),
    cmd("serve deploy railway", "Deploy seller runtime to Railway"),
    cmd("serve deploy railway setup", "First-time Railway project setup"),
    cmd("serve deploy railway status", "Show remote deployment status"),
    cmd("serve deploy railway logs", "Show remote deployment logs"),
    flag("--follow, -f", "Tail logs in real time"),
    cmd("serve deploy railway teardown", "Remove Railway deployment"),
    cmd("serve deploy railway env", "List env vars on Railway"),
    cmd("serve deploy railway env set", "Set env var (KEY=value)"),
    cmd("serve deploy railway env delete", "Delete an env var"),
    "",
    section("Social"),
    cmd("social twitter login", "Get Twitter/X authentication link"),
    cmd("social twitter post <text>", "Post a tweet"),
    cmd("social twitter reply <tweet-id> <text>", "Reply to a tweet by ID"),
    cmd("social twitter search <query>", "Search tweets"),
    flag("--max-results <n>", "Maximum number of results (10-100)"),
    flag("--exclude-retweets", "Exclude retweets"),
    flag("--sort <order>", "Sort order: relevancy or recency"),
    cmd("social twitter timeline", "Get timeline tweets"),
    flag("--max-results <n>", "Maximum number of results"),
    cmd("social twitter logout", "Logout from Twitter/X"),
    "",
    section("Flags"),
    flag("--json", "Output raw JSON (for agents/scripts)"),
    flag("--help, -h", "Show this help"),
    flag("--version, -v", "Show version"),
    "",
  ];
  return lines.join("\n");
}

// -- Main --

async function main(): Promise<void> {
  let args = process.argv.slice(2);

  // Global flags
  const jsonFlag = hasFlag(args, "--json") || process.env.ACP_JSON === "1";
  if (jsonFlag) setJsonMode(true);
  args = removeFlags(args, "--json");

  if (hasFlag(args, "--version", "-v")) {
    console.log(VERSION);
    return;
  }

  if (args.length === 0 || hasFlag(args, "--help", "-h")) {
    console.log(buildHelp());
    return;
  }

  const [command, subcommand, ...rest] = args;

  // Commands that don't need API key
  if (command === "version") {
    console.log(VERSION);
    return;
  }

  if (command === "setup") {
    const { setup } = await import("../src/commands/setup.js");
    return setup();
  }

  if (command === "login") {
    const { login } = await import("../src/commands/setup.js");
    return login();
  }

  if (command === "agent") {
    const agent = await import("../src/commands/agent.js");
    if (subcommand === "list") return agent.list();
    if (subcommand === "create") return agent.create(rest[0]);
    if (subcommand === "switch") {
      const walletAddr = getFlagValue(rest, "--wallet");
      if (walletAddr) return agent.switchAgent(walletAddr);
      const nameArg = removeFlagWithValue(rest, "--wallet")[0];
      return agent.switchAgentByName(nameArg);
    }
    console.log(buildHelp());
    return;
  }

  // Browse uses external API — no API key required
  if (command === "browse") {
    const { search } = await import("../src/commands/search.js");
    let searchArgs = [subcommand, ...rest].filter(Boolean);

    const mode = getFlagValue(searchArgs, "--mode") as "hybrid" | "vector" | "keyword" | undefined;
    searchArgs = removeFlagWithValue(searchArgs, "--mode");

    const contains = getFlagValue(searchArgs, "--contains");
    searchArgs = removeFlagWithValue(searchArgs, "--contains");

    const matchVal = getFlagValue(searchArgs, "--match") as "all" | "any" | undefined;
    searchArgs = removeFlagWithValue(searchArgs, "--match");

    const simCutoff = getFlagValue(searchArgs, "--similarity-cutoff");
    searchArgs = removeFlagWithValue(searchArgs, "--similarity-cutoff");

    const sparCutoff = getFlagValue(searchArgs, "--sparse-cutoff");
    searchArgs = removeFlagWithValue(searchArgs, "--sparse-cutoff");

    const topK = getFlagValue(searchArgs, "--top-k");
    searchArgs = removeFlagWithValue(searchArgs, "--top-k");

    const query = searchArgs.filter((a) => a && !a.startsWith("-")).join(" ");

    return search(query, {
      mode,
      contains,
      match: matchVal,
      similarityCutoff: simCutoff !== undefined ? parseFloat(simCutoff) : undefined,
      sparseCutoff: sparCutoff !== undefined ? parseFloat(sparCutoff) : undefined,
      topK: topK !== undefined ? parseInt(topK, 10) : undefined,
    });
  }

  // All other commands need API key
  requireApiKey();

  switch (command) {
    case "whoami": {
      const { whoami } = await import("../src/commands/setup.js");
      return whoami();
    }

    case "wallet": {
      const wallet = await import("../src/commands/wallet.js");
      if (subcommand === "address") return wallet.address();
      if (subcommand === "balance") return wallet.balance();
      if (subcommand === "topup") return wallet.topup();
      console.log(buildHelp());
      return;
    }

    case "job": {
      const job = await import("../src/commands/job.js");
      if (subcommand === "create") {
        const walletAddr = rest[0];
        const offering = rest[1];
        let remaining = rest.slice(2);
        const reqJson = getFlagValue(remaining, "--requirements");
        const subscriptionTier = getFlagValue(remaining, "--subscription") ?? undefined;
        remaining = removeFlagWithValue(remaining, "--requirements");
        remaining = removeFlagWithValue(remaining, "--subscription");

        const isAutomatedStr = getFlagValue(remaining, "--isAutomated");
        remaining = removeFlagWithValue(remaining, "--isAutomated");

        let requirements: Record<string, unknown> = {};
        if (reqJson) {
          try {
            requirements = JSON.parse(reqJson);
          } catch {
            console.error("Error: Invalid JSON in --requirements");
            process.exit(1);
          }
        }
        let isAutomated = false;
        if (typeof isAutomatedStr === "string") {
          const lowered = isAutomatedStr.toLowerCase();
          if (["true", "1"].includes(lowered)) {
            isAutomated = true;
          } else if (["false", "0"].includes(lowered)) {
            isAutomated = false;
          } else {
            console.error("Error: --isAutomated must be true or false");
            process.exit(1);
          }
        }

        return job.create(walletAddr, offering, requirements, subscriptionTier, isAutomated);
      }
      if (subcommand === "status") {
        return job.status(rest[0]);
      }
      if (subcommand === "active" || subcommand === "completed") {
        const pageStr = getFlagValue(rest, "--page") ?? rest[0];
        const pageSizeStr = getFlagValue(rest, "--pageSize") ?? rest[1];
        const page =
          pageStr != null && /^\d+$/.test(String(pageStr))
            ? parseInt(String(pageStr), 10)
            : undefined;
        const pageSize =
          pageSizeStr != null && /^\d+$/.test(String(pageSizeStr))
            ? parseInt(String(pageSizeStr), 10)
            : undefined;
        const opts = {
          page: Number.isNaN(page) ? undefined : page,
          pageSize: Number.isNaN(pageSize) ? undefined : pageSize,
        };
        if (subcommand === "active") return job.active(opts);
        return job.completed(opts);
      }
      if (subcommand === "pay") {
        const jobId = rest[0];
        const acceptStr = getFlagValue(rest, "--accept");
        if (!acceptStr) {
          console.error("Error: --accept <true|false> is required");
          process.exit(1);
        }
        const lowered = acceptStr.toLowerCase();
        let accept: boolean;
        if (["true", "1"].includes(lowered)) {
          accept = true;
        } else if (["false", "0"].includes(lowered)) {
          accept = false;
        } else {
          console.error("Error: --accept must be true or false");
          process.exit(1);
        }
        const content = getFlagValue(rest, "--content");
        return job.pay(jobId, accept, content);
      }
      console.log(buildHelp());
      return;
    }

    case "bounty": {
      const bounty = await import("../src/commands/bounty.js");
      if (subcommand === "create") {
        const titleFlag = getFlagValue(rest, "--title");
        const descFlag = getFlagValue(rest, "--description");
        const budgetFlag = getFlagValue(rest, "--budget");
        const categoryFlag = getFlagValue(rest, "--category");
        const tagsFlag = getFlagValue(rest, "--tags");
        const sourceChannelFlag = getFlagValue(rest, "--source-channel");

        if (titleFlag || budgetFlag) {
          const budget = budgetFlag != null ? Number(budgetFlag) : undefined;
          return bounty.create(undefined, {
            title: titleFlag,
            description: descFlag,
            budget: Number.isFinite(budget) ? budget : undefined,
            category: categoryFlag,
            tags: tagsFlag,
            sourceChannel: sourceChannelFlag,
          });
        }

        const query = rest.filter((a) => a != null && !String(a).startsWith("-")).join(" ");
        return bounty.create(query || undefined, {
          sourceChannel: sourceChannelFlag,
        });
      }
      if (subcommand === "update") {
        const updateBountyId = rest[0];
        const updateTitle = getFlagValue(rest, "--title");
        const updateDesc = getFlagValue(rest, "--description");
        const updateBudgetStr = getFlagValue(rest, "--budget");
        const updateTags = getFlagValue(rest, "--tags");
        const updateBudget = updateBudgetStr != null ? Number(updateBudgetStr) : undefined;
        return bounty.update(updateBountyId, {
          title: updateTitle,
          description: updateDesc,
          budget: Number.isFinite(updateBudget) ? updateBudget : undefined,
          tags: updateTags,
        });
      }
      if (subcommand === "poll") return bounty.poll();
      if (subcommand === "list") return bounty.list();
      if (subcommand === "status") {
        const syncFlag = hasFlag(rest, "--sync");
        const statusBountyId = rest.filter((a) => a !== "--sync")[0];
        return bounty.status(statusBountyId, { sync: syncFlag });
      }
      if (subcommand === "select") return bounty.select(rest[0]);
      if (subcommand === "cancel") return bounty.cancel(rest[0]);
      if (subcommand === "cleanup") return bounty.cleanup(rest[0]);
      console.log(buildHelp());
      return;
    }

    case "token": {
      const token = await import("../src/commands/token.js");
      if (subcommand === "launch") {
        let remaining = rest;
        const imageUrl = getFlagValue(remaining, "--image");
        remaining = removeFlagWithValue(remaining, "--image");
        const symbol = remaining[0];
        const description = remaining.slice(1).join(" ");
        return token.launch(symbol, description, imageUrl);
      }
      if (subcommand === "info") return token.info();
      console.log(buildHelp());
      return;
    }

    case "profile": {
      const profile = await import("../src/commands/profile.js");
      if (subcommand === "show") return profile.show();
      if (subcommand === "update") {
        const key = rest[0];
        const value = rest.slice(1).join(" ");
        return profile.update(key, value);
      }
      console.log(buildHelp());
      return;
    }

    case "sell": {
      const sell = await import("../src/commands/sell.js");
      if (subcommand === "sub") {
        const sub = await import("../src/commands/subscription.js");
        const subSubcommand = rest[0];
        if (subSubcommand === "list") return sub.list();
        if (subSubcommand === "create") {
          const name = rest[1];
          const price = rest[2] != null ? Number(rest[2]) : undefined;
          const duration = rest[3] != null ? Number(rest[3]) : undefined;
          return sub.create(name, price, duration);
        }
        if (subSubcommand === "delete") return sub.del(rest[1]);
        console.log(buildHelp());
        return;
      }
      if (subcommand === "resource") {
        const resourceSubcommand = rest[0];
        if (resourceSubcommand === "init") return sell.resourceInit(rest[1]);
        if (resourceSubcommand === "create") return sell.resourceCreate(rest[1]);
        if (resourceSubcommand === "delete") return sell.resourceDelete(rest[1]);
        if (resourceSubcommand === "list") return sell.resourceList();
        console.log(buildHelp());
        return;
      }
      if (subcommand === "init") return sell.init(rest[0]);
      if (subcommand === "create") return sell.create(rest[0]);
      if (subcommand === "delete") return sell.del(rest[0]);
      if (subcommand === "list") return sell.list();
      if (subcommand === "inspect") return sell.inspect(rest[0]);
      console.log(buildHelp());
      return;
    }

    case "serve": {
      const serve = await import("../src/commands/serve.js");
      if (subcommand === "start") return serve.start();
      if (subcommand === "stop") return serve.stop();
      if (subcommand === "status") return serve.status();
      if (subcommand === "logs") {
        const filter = {
          offering: getFlagValue(rest, "--offering"),
          job: getFlagValue(rest, "--job"),
          level: getFlagValue(rest, "--level"),
        };
        return serve.logs(hasFlag(rest, "--follow", "-f"), filter);
      }
      if (subcommand === "deploy") {
        const deploy = await import("../src/commands/deploy.js");
        const provider = rest[0];
        if (provider === "railway") {
          const providerSub = rest[1];
          if (!providerSub) return deploy.deploy();
          if (providerSub === "setup") return deploy.setup();
          if (providerSub === "status") return deploy.status();
          if (providerSub === "logs") {
            const logsArgs = rest.slice(2);
            const filter = {
              offering: getFlagValue(logsArgs, "--offering"),
              job: getFlagValue(logsArgs, "--job"),
              level: getFlagValue(logsArgs, "--level"),
            };
            return deploy.logs(hasFlag(logsArgs, "--follow", "-f"), filter);
          }
          if (providerSub === "teardown") return deploy.teardown();
          if (providerSub === "env") {
            const envAction = rest[2];
            if (!envAction) return deploy.env();
            if (envAction === "set") return deploy.envSet(rest[3]);
            if (envAction === "delete") return deploy.envDelete(rest[3]);
            console.log(buildHelp());
            return;
          }
        }
        console.log(buildHelp());
        return;
      }
      console.log(buildHelp());
      return;
    }

    case "resource": {
      const resource = await import("../src/commands/resource.js");
      if (subcommand === "query") {
        const url = rest[0];
        const paramsJson = getFlagValue(rest, "--params");
        let params: Record<string, any> | undefined;
        if (paramsJson) {
          try {
            params = JSON.parse(paramsJson);
          } catch {
            console.error("Error: Invalid JSON in --params");
            process.exit(1);
          }
        }
        return resource.query(url, params);
      }
      console.log(buildHelp());
      return;
    }

    case "social": {
      if (subcommand === "twitter") {
        const [twitterAction, ...twitterRest] = rest;
        const twitter = await import("../src/commands/twitter.js");
        if (twitterAction === "login") return twitter.auth();
        if (twitterAction === "post") {
          const tweetText = twitterRest.join(" ");
          return twitter.post(tweetText);
        }
        if (twitterAction === "reply") {
          const tweetId = twitterRest[0];
          const replyText = twitterRest.slice(1).join(" ");
          return twitter.reply(tweetId, replyText);
        }
        if (twitterAction === "search") {
          const query = twitterRest.filter((a) => !a.startsWith("--")).join(" ");
          const maxResultsStr = getFlagValue(twitterRest, "--max-results");
          const maxResults = maxResultsStr ? parseInt(maxResultsStr, 10) : undefined;
          const excludeRetweets = hasFlag(twitterRest, "--exclude-retweets");
          const sortOrder = getFlagValue(twitterRest, "--sort") as
            | "relevancy"
            | "recency"
            | undefined;
          return twitter.search(query, {
            maxResults: isNaN(maxResults as number) ? undefined : maxResults,
            excludeRetweets: excludeRetweets || undefined,
            sortOrder,
          });
        }
        if (twitterAction === "timeline") {
          const maxResultsStr = getFlagValue(twitterRest, "--max-results");
          const maxResults = maxResultsStr ? parseInt(maxResultsStr, 10) : undefined;
          return twitter.timeline(isNaN(maxResults as number) ? undefined : maxResults);
        }
        if (twitterAction === "logout") return twitter.performLogout();
      }
      console.log(buildHelp());
      return;
    }

    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(buildHelp());
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
