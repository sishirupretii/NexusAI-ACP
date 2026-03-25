// =============================================================================
// Railway CLI wrapper for deployment operations.
// =============================================================================

import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as output from "../lib/output.js";
import type { RailwayProjectConfig } from "../lib/config.js";

function runCmd(cmd: string, opts?: { stdio?: any }): string {
  return execSync(cmd, {
    encoding: "utf-8",
    stdio: opts?.stdio ?? ["pipe", "pipe", "pipe"],
  }).trim();
}

export async function ensureRailwayCli(): Promise<void> {
  try {
    runCmd("railway --version");
  } catch {
    output.fatal(
      "Railway CLI not found. Install it:\n" +
        "  npm install -g @railway/cli\n" +
        "  Then run: railway login"
    );
  }
}

export async function ensureRailwayAuth(): Promise<void> {
  try {
    runCmd("railway whoami");
  } catch {
    output.log("  Railway login required...\n");
    try {
      execSync("railway login --browserless", { stdio: "inherit" });
    } catch {
      try {
        execSync("railway login", { stdio: "inherit" });
      } catch {
        output.fatal("Railway login failed. Run `railway login` manually.");
      }
    }
  }
}

export async function createRailwayProject(agentName: string): Promise<RailwayProjectConfig> {
  const projectName = `acp-${agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  try {
    const result = runCmd(`railway init --name "${projectName}"`);
    // Parse project info from railway output
    const projectId = result.match(/project[:\s]+([a-f0-9-]+)/i)?.[1] || projectName;
    return {
      project: projectId,
      environment: "production",
    };
  } catch (e) {
    throw new Error(
      `Failed to create Railway project: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export async function linkService(): Promise<void> {
  runCmd("railway link", { stdio: "inherit" });
}

export async function deployToRailway(): Promise<void> {
  execSync("railway up --detach", { stdio: "inherit" });
}

export async function getRailwayStatus(): Promise<any> {
  try {
    const result = runCmd("railway status");
    return result;
  } catch (e) {
    return `No active deployment found.`;
  }
}

export async function teardownRailway(): Promise<void> {
  execSync("railway down", { stdio: "inherit" });
}

export async function getRailwayLogs(
  follow: boolean,
  filter?: { offering?: string; job?: string; level?: string }
): Promise<void> {
  const args = ["railway", "logs"];
  if (follow) args.push("--follow");

  const child = spawn(args[0], args.slice(1), {
    stdio: filter ? ["pipe", "pipe", "inherit"] : "inherit",
  });

  if (filter && child.stdout) {
    child.stdout.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (filter.offering && !lower.includes(filter.offering.toLowerCase())) continue;
        if (filter.job && !lower.includes(filter.job)) continue;
        if (filter.level && !lower.includes(filter.level.toLowerCase())) continue;
        process.stdout.write(line + "\n");
      }
    });
  }

  if (follow) {
    process.on("SIGINT", () => {
      child.kill();
      process.exit(0);
    });
  }

  await new Promise<void>((resolve) => child.on("close", () => resolve()));
}

export async function getRailwayEnv(): Promise<Record<string, string>> {
  try {
    const result = runCmd("railway variables");
    const vars: Record<string, string> = {};
    for (const line of result.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) vars[match[1]] = match[2];
    }
    return vars;
  } catch {
    return {};
  }
}

export async function setRailwayEnv(keyValue: string): Promise<void> {
  execSync(`railway variables set ${keyValue}`, { stdio: "inherit" });
}

export async function deleteRailwayEnv(key: string): Promise<void> {
  execSync(`railway variables delete ${key}`, { stdio: "inherit" });
}
