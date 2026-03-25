// =============================================================================
// acp serve deploy railway — Deploy seller runtime to Railway.
// =============================================================================

import * as output from "../lib/output.js";
import { readConfig, writeConfig, sanitizeAgentName, type DeployInfo } from "../lib/config.js";
import { requireActiveAgent, getMyAgentInfo } from "../lib/wallet.js";
import {
  ensureRailwayCli,
  ensureRailwayAuth,
  createRailwayProject,
  linkService,
  deployToRailway,
  getRailwayStatus,
  teardownRailway,
  getRailwayLogs,
  getRailwayEnv,
  setRailwayEnv,
  deleteRailwayEnv,
} from "../deploy/railway.js";
import { generateDockerfile, generateDockerignore } from "../deploy/docker.js";
import * as fs from "fs";
import { ROOT } from "../lib/config.js";
import * as path from "path";

function getDeployInfo(agentId: string): DeployInfo | undefined {
  const config = readConfig();
  return config.DEPLOYS?.[agentId];
}

function saveDeployInfo(agentId: string, info: DeployInfo): void {
  const config = readConfig();
  if (!config.DEPLOYS) config.DEPLOYS = {};
  config.DEPLOYS[agentId] = info;
  writeConfig(config);
}

export async function setup(): Promise<void> {
  await ensureRailwayCli();
  await ensureRailwayAuth();

  const agent = await requireActiveAgent();

  output.log(`\n  Creating Railway project for agent: ${agent.name}\n`);

  try {
    const config = await createRailwayProject(agent.name);

    const agentConfig = readConfig();
    const agentEntry = agentConfig.agents?.find((a) => a.active);
    if (agentEntry) {
      saveDeployInfo(agentEntry.id, {
        provider: "railway",
        agentName: agent.name,
        offerings: [],
        deployedAt: "",
        railwayConfig: config,
      });
    }

    output.success(`Railway project created for ${agent.name}`);
    output.field("Project", config.project);
    output.log("\n  Next: acp serve deploy railway\n");
  } catch (e) {
    output.fatal(`Setup failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function deploy(): Promise<void> {
  await ensureRailwayCli();

  const agent = await requireActiveAgent();

  // Generate Docker files if missing
  const dockerfilePath = path.join(ROOT, "Dockerfile");
  const dockerignorePath = path.join(ROOT, ".dockerignore");

  if (!fs.existsSync(dockerfilePath)) {
    fs.writeFileSync(dockerfilePath, generateDockerfile());
    output.log("  Generated Dockerfile");
  }
  if (!fs.existsSync(dockerignorePath)) {
    fs.writeFileSync(dockerignorePath, generateDockerignore());
    output.log("  Generated .dockerignore");
  }

  // Get registered offerings
  let offerings: string[] = [];
  try {
    const info = await getMyAgentInfo();
    offerings = (info.jobs ?? []).map((j) => j.name);
  } catch {
    // Non-fatal
  }

  try {
    await deployToRailway();

    const agentConfig = readConfig();
    const agentEntry = agentConfig.agents?.find((a) => a.active);
    if (agentEntry) {
      const existing = getDeployInfo(agentEntry.id);
      saveDeployInfo(agentEntry.id, {
        ...(existing ?? {
          provider: "railway",
          agentName: agent.name,
          railwayConfig: { project: "", environment: "" },
        }),
        offerings,
        deployedAt: new Date().toISOString(),
      });
    }

    output.success("Deployed to Railway successfully!");
    output.log("  Check status: acp serve deploy railway status\n");
  } catch (e) {
    output.fatal(`Deploy failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function status(): Promise<void> {
  await ensureRailwayCli();

  try {
    const info = await getRailwayStatus();
    output.output(info, (data) => {
      output.heading("Railway Deployment");
      output.log(typeof data === "string" ? data : JSON.stringify(data, null, 2));
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to get status: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function logs(
  follow: boolean,
  filter?: { offering?: string; job?: string; level?: string }
): Promise<void> {
  await ensureRailwayCli();
  await getRailwayLogs(follow, filter);
}

export async function teardown(): Promise<void> {
  await ensureRailwayCli();

  try {
    await teardownRailway();
    output.success("Railway deployment removed.");
    output.log("");
  } catch (e) {
    output.fatal(`Teardown failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function env(): Promise<void> {
  await ensureRailwayCli();

  try {
    const vars = await getRailwayEnv();
    output.output(vars, (data) => {
      output.heading("Railway Environment Variables");
      if (typeof data === "string") {
        output.log(data);
      } else {
        for (const [key, val] of Object.entries(data)) {
          output.log(`  ${key}=${val}`);
        }
      }
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to get env: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function envSet(keyValue: string): Promise<void> {
  if (!keyValue?.includes("=")) {
    output.fatal("Usage: acp serve deploy railway env set KEY=value");
  }

  await ensureRailwayCli();

  try {
    await setRailwayEnv(keyValue);
    output.success(`Environment variable set: ${keyValue.split("=")[0]}`);
    output.log("");
  } catch (e) {
    output.fatal(`Failed to set env: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function envDelete(key: string): Promise<void> {
  if (!key?.trim()) {
    output.fatal("Usage: acp serve deploy railway env delete <KEY>");
  }

  await ensureRailwayCli();

  try {
    await deleteRailwayEnv(key);
    output.success(`Environment variable deleted: ${key}`);
    output.log("");
  } catch (e) {
    output.fatal(`Failed to delete env: ${e instanceof Error ? e.message : String(e)}`);
  }
}
