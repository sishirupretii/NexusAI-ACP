// =============================================================================
// acp serve — Manage the seller runtime.
// =============================================================================

import { spawn, execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as output from "../lib/output.js";
import {
  ROOT,
  LOGS_DIR,
  findSellerPid,
  writePidToConfig,
  removePidFromConfig,
  checkForExistingProcess,
  sanitizeAgentName,
} from "../lib/config.js";
import { requireActiveAgent, getMyAgentInfo } from "../lib/wallet.js";

const SELLER_LOG = path.resolve(ROOT, "seller.log");

export async function start(): Promise<void> {
  checkForExistingProcess();

  const agent = await requireActiveAgent();
  const agentDir = sanitizeAgentName(agent.name);

  // Check if there are offerings registered
  let registeredJobs: string[] = [];
  try {
    const info = await getMyAgentInfo();
    registeredJobs = (info.jobs ?? []).map((j) => j.name);
  } catch {
    // Non-fatal
  }

  if (!registeredJobs.length) {
    output.warn("No offerings registered on ACP. The seller will start but won't receive jobs.");
    output.log("  Create one first: acp sell init <name> && acp sell create <name>\n");
  }

  // Check local handlers exist for registered offerings
  const offeringsRoot = path.resolve(ROOT, "src", "seller", "offerings", agentDir);
  for (const jobName of registeredJobs) {
    const handlersPath = path.join(offeringsRoot, jobName, "handlers.ts");
    if (!fs.existsSync(handlersPath)) {
      output.warn(`Missing local handlers for "${jobName}": ${handlersPath}`);
    }
  }

  // Start seller as detached process
  const logStream = fs.openSync(SELLER_LOG, "a");

  const child = spawn("npx", ["tsx", "src/seller/runtime/seller.ts"], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", logStream, logStream],
  });

  if (child.pid) {
    writePidToConfig(child.pid);
    child.unref();

    output.output({ pid: child.pid, agent: agent.name }, () => {
      output.success(`Seller runtime started (PID: ${child.pid})`);
      output.field("Agent", agent.name);
      output.log("  Logs: acp serve logs --follow\n");
    });
  } else {
    output.fatal("Failed to start seller runtime.");
  }
}

export async function stop(): Promise<void> {
  const pid = findSellerPid();
  if (!pid) {
    output.output({ running: false }, () => {
      output.log("  Seller is not running.\n");
    });
    return;
  }

  try {
    process.kill(pid, "SIGTERM");

    // Wait up to 2s for graceful shutdown
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline) {
      try {
        process.kill(pid, 0);
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        break;
      }
    }

    removePidFromConfig();
    output.output({ pid, stopped: true }, () => {
      output.success(`Seller stopped (PID: ${pid})`);
      output.log("");
    });
  } catch {
    output.warn(`Could not stop seller (PID: ${pid}). Try: kill -9 ${pid}`);
  }
}

export async function status(): Promise<void> {
  const pid = findSellerPid();

  output.output({ running: !!pid, pid }, (data) => {
    output.heading("Seller Status");
    if (data.running) {
      output.field("Status", output.colors.green("Running"));
      output.field("PID", String(data.pid));
    } else {
      output.field("Status", "Stopped");
    }
    output.log("");
  });
}

export async function logs(
  follow: boolean,
  filter?: { offering?: string; job?: string; level?: string }
): Promise<void> {
  if (!fs.existsSync(SELLER_LOG)) {
    output.log("  No seller logs found.\n");
    return;
  }

  if (follow) {
    const child = spawn("tail", ["-f", SELLER_LOG], {
      stdio: filter ? ["pipe", "pipe", "inherit"] : "inherit",
    });

    if (filter && child.stdout) {
      child.stdout.on("data", (data: Buffer) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
          if (matchesFilter(line, filter)) {
            process.stdout.write(line + "\n");
          }
        }
      });
    }

    process.on("SIGINT", () => {
      child.kill();
      process.exit(0);
    });
  } else {
    const content = fs.readFileSync(SELLER_LOG, "utf-8");
    const lines = content.split("\n").slice(-50);
    for (const line of lines) {
      if (!filter || matchesFilter(line, filter)) {
        console.log(line);
      }
    }
  }
}

function matchesFilter(
  line: string,
  filter: { offering?: string; job?: string; level?: string }
): boolean {
  const lower = line.toLowerCase();
  if (filter.offering && !lower.includes(filter.offering.toLowerCase())) return false;
  if (filter.job && !lower.includes(filter.job)) return false;
  if (filter.level && !lower.includes(filter.level.toLowerCase())) return false;
  return true;
}
