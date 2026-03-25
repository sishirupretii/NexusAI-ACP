// =============================================================================
// nexus swarm — Multi-agent coordination and management.
// Spawn, manage, and coordinate multiple agents as a swarm.
// =============================================================================

import * as output from "../lib/output.js";
import { readConfig, writeConfig, type AgentEntry } from "../lib/config.js";
import { ensureSession, createAgentApi, fetchAgents, syncAgentsToConfig } from "../lib/auth.js";
import { getMyAgentInfo } from "../lib/wallet.js";
import client from "../lib/client.js";

export async function create(name: string, count: number = 3): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: nexus swarm create <swarm-name> [count]");
  }
  if (count < 1 || count > 20) {
    output.fatal("Count must be between 1 and 20.");
  }

  const sessionToken = await ensureSession();

  output.log(`\n  Creating swarm "${name}" with ${count} agents...\n`);

  const created: AgentEntry[] = [];

  for (let i = 1; i <= count; i++) {
    const agentName = `${name}-${String(i).padStart(2, "0")}`;
    try {
      output.log(`  Creating ${agentName}...`);
      const result = await createAgentApi(sessionToken, agentName);

      const entry: AgentEntry = {
        id: result.id,
        name: result.name || agentName,
        walletAddress: result.walletAddress,
        apiKey: result.apiKey,
        active: false,
      };
      created.push(entry);

      // Add to local config
      const config = readConfig();
      const agents = config.agents ?? [];
      agents.push(entry);
      writeConfig({ ...config, agents });

      output.success(`${agentName} created (${result.walletAddress})`);
    } catch (e) {
      output.warn(`Failed to create ${agentName}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  output.output({ swarm: name, created: created.length, agents: created }, () => {
    output.log("");
    output.heading(`Swarm "${name}" Created`);
    output.field("Total Agents", String(created.length));
    output.log("");
    for (const a of created) {
      output.log(`  ${a.name.padEnd(25)} ${a.walletAddress}`);
    }
    output.log("");
    output.log("  Next steps:");
    output.log(`    nexus swarm broadcast "Your task instructions"`);
    output.log("    nexus swarm status");
    output.log("");
  });
}

export async function status(): Promise<void> {
  const config = readConfig();
  const agents = config.agents ?? [];

  if (!agents.length) {
    output.log("  No agents configured. Run `nexus setup` first.\n");
    return;
  }

  // Group agents by swarm prefix
  const swarms = new Map<string, AgentEntry[]>();
  const standalone: AgentEntry[] = [];

  for (const a of agents) {
    const match = a.name.match(/^(.+)-\d{2}$/);
    if (match) {
      const prefix = match[1];
      if (!swarms.has(prefix)) swarms.set(prefix, []);
      swarms.get(prefix)!.push(a);
    } else {
      standalone.push(a);
    }
  }

  output.output({ swarms: Object.fromEntries(swarms), standalone, total: agents.length }, () => {
    output.heading("Swarm Status");
    output.field("Total Agents", String(agents.length));
    output.log("");

    if (swarms.size > 0) {
      for (const [name, members] of swarms) {
        output.log(`  ${output.colors.bold(`Swarm: ${name}`)} (${members.length} agents)`);
        for (const a of members) {
          const marker = a.active ? output.colors.green(" [active]") : "";
          output.log(`    ${a.name}${marker}  ${a.walletAddress}`);
        }
        output.log("");
      }
    }

    if (standalone.length > 0) {
      output.log(`  ${output.colors.bold("Standalone Agents")}`);
      for (const a of standalone) {
        const marker = a.active ? output.colors.green(" [active]") : "";
        output.log(`    ${a.name}${marker}  ${a.walletAddress}`);
      }
      output.log("");
    }
  });
}

export async function broadcast(message: string): Promise<void> {
  if (!message?.trim()) {
    output.fatal("Usage: nexus swarm broadcast <message>");
  }

  const config = readConfig();
  const agents = config.agents ?? [];

  if (agents.length <= 1) {
    output.fatal("Need multiple agents for swarm broadcast. Create a swarm first.");
  }

  output.output({ message, agentCount: agents.length }, () => {
    output.heading("Swarm Broadcast");
    output.field("Message", message);
    output.field("Recipients", String(agents.length));
    output.log("");
    output.log("  To execute tasks across the swarm, use the autopilot:");
    output.log("    nexus autopilot start --strategy aggressive");
    output.log("");
    output.log("  Or create jobs manually for each agent:");
    for (const a of agents.slice(0, 5)) {
      output.log(
        `    acp job create ${a.walletAddress} "<offering>" --requirements '${JSON.stringify({ task: message })}'`
      );
    }
    if (agents.length > 5) {
      output.log(`    ... and ${agents.length - 5} more agents`);
    }
    output.log("");
  });
}

export async function destroy(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: nexus swarm destroy <swarm-name>");
  }

  const config = readConfig();
  const agents = config.agents ?? [];
  const pattern = new RegExp(`^${name}-\\d{2}$`);

  const toRemove = agents.filter((a) => pattern.test(a.name));
  const toKeep = agents.filter((a) => !pattern.test(a.name));

  if (!toRemove.length) {
    output.fatal(`No swarm agents found matching "${name}-XX".`);
  }

  writeConfig({ ...config, agents: toKeep });

  output.output({ swarm: name, removed: toRemove.length }, () => {
    output.success(`Swarm "${name}" destroyed (${toRemove.length} agents removed from config).`);
    output.log("  Note: Agents still exist on the server. Use app.virtuals.io to delete them.\n");
  });
}
