// =============================================================================
// acp agent — Manage multiple agents.
// =============================================================================

import readline from "readline";
import * as output from "../lib/output.js";
import {
  readConfig,
  writeConfig,
  activateAgent,
  findAgentByName,
  findAgentByWalletAddress,
  findSellerPid,
  type AgentEntry,
} from "../lib/config.js";
import {
  ensureSession,
  fetchAgents,
  createAgentApi,
  regenerateApiKey,
  isAgentApiKeyValid,
  syncAgentsToConfig,
} from "../lib/auth.js";

function redactApiKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

function displayAgents(agents: AgentEntry[]): void {
  for (const a of agents) {
    const marker = a.active ? output.colors.green(" (active)") : "";
    output.log(`  ${output.colors.bold(a.name)}${marker}`);
    output.log(`    Wallet:  ${a.walletAddress}`);
    if (a.apiKey) output.log(`    API Key: ${redactApiKey(a.apiKey)}`);
  }
}

function confirmPrompt(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      const lower = answer.trim().toLowerCase();
      resolve(lower === "y" || lower === "yes" || lower === "");
    });
  });
}

/** Check if seller is running and ask user before stopping. */
export async function stopSellerIfRunning(): Promise<boolean> {
  const pid = findSellerPid();
  if (!pid) return true;

  output.warn(`Seller runtime is running (PID: ${pid}).`);
  output.log("  Switching agents will stop the seller and delist active job offerings.\n");

  const proceed = await confirmPrompt("  Continue? (Y/n): ");
  if (!proceed) return false;

  try {
    process.kill(pid, "SIGTERM");
    output.success("Seller process stopped.");
  } catch {
    output.warn("Could not stop seller process. You may need to stop it manually.");
  }
  return true;
}

export async function switchAgent(walletAddress: string): Promise<void> {
  const agent = findAgentByWalletAddress(walletAddress);
  if (!agent) {
    output.fatal(`No agent found with wallet address: ${walletAddress}`);
  }

  // Check if existing key is still valid
  if (agent.apiKey) {
    const valid = await isAgentApiKeyValid(agent.apiKey);
    if (valid) {
      activateAgent(agent.id, agent.apiKey);
      return;
    }
  }

  // Need to regenerate key
  const sessionToken = await ensureSession();
  const result = await regenerateApiKey(sessionToken, walletAddress);
  activateAgent(agent.id, result.apiKey);
}

export async function switchAgentByName(name: string): Promise<void> {
  if (!name) {
    output.fatal("Usage: acp agent switch <agent-name>");
  }

  const agent = findAgentByName(name);
  if (!agent) {
    output.fatal(
      `No agent found with name "${name}". Run \`acp agent list\` to see available agents.`
    );
  }

  const proceed = await stopSellerIfRunning();
  if (!proceed) return;

  await switchAgent(agent.walletAddress);
  output.success(`Switched to agent: ${agent.name}`);
  output.field("Wallet", agent.walletAddress);
  output.log("");
}

export async function list(): Promise<void> {
  const sessionToken = await ensureSession();

  let serverAgents;
  try {
    serverAgents = await fetchAgents(sessionToken);
  } catch (e) {
    output.warn(`Could not fetch agents: ${e instanceof Error ? e.message : String(e)}`);
    const config = readConfig();
    const local = config.agents ?? [];
    if (local.length === 0) {
      output.log("  No agents found. Run `acp setup` to create one.\n");
      return;
    }
    output.output(local, (agents) => {
      output.heading("Your Agents (local cache)");
      displayAgents(agents);
      output.log("");
    });
    return;
  }

  const agents = syncAgentsToConfig(serverAgents);

  output.output(agents, (list) => {
    output.heading("Your Agents");
    if (!list.length) {
      output.log("  No agents found. Run `acp setup` to create one.\n");
      return;
    }
    displayAgents(list);
    output.log("");
  });
}

export async function create(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp agent create <agent-name>");
  }

  const proceed = await stopSellerIfRunning();
  if (!proceed) return;

  const sessionToken = await ensureSession();

  try {
    const result = await createAgentApi(sessionToken, name);
    if (!result?.apiKey) {
      output.fatal("Create agent failed — no API key returned.");
    }

    const config = readConfig();
    const updatedAgents = (config.agents ?? []).map((a) => ({ ...a, active: false }) as AgentEntry);

    const newAgent: AgentEntry = {
      id: result.id,
      name: result.name || name,
      walletAddress: result.walletAddress,
      apiKey: result.apiKey,
      active: true,
    };
    updatedAgents.push(newAgent);

    writeConfig({
      ...config,
      LITE_AGENT_API_KEY: result.apiKey,
      agents: updatedAgents,
    });

    output.output(newAgent, (a) => {
      output.heading("Agent Created");
      output.field("Name", a.name);
      output.field("Wallet", a.walletAddress);
      output.field("API Key", redactApiKey(a.apiKey));
      output.log("");
    });
  } catch (e) {
    output.fatal(`Create agent failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
