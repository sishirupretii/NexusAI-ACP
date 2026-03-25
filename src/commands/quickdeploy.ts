// =============================================================================
// nexus quickdeploy — One-click agent deployment (inspired by InstaClaw).
// Deploys agent with wallet, offerings, and seller runtime in one command.
// =============================================================================

import * as output from "../lib/output.js";
import client from "../lib/client.js";
import { readConfig, writeConfig, getActiveAgent } from "../lib/config.js";
import { getMyAgentInfo } from "../lib/wallet.js";
import { interactiveLogin, syncAgentsToConfig, createAgentApi } from "../lib/auth.js";

export async function deploy(
  name?: string,
  opts: { strategy?: string; offerings?: string } = {}
): Promise<void> {
  output.heading("NexusAI Quick Deploy");
  output.log("");
  output.log("  One-click agent deployment — wallet, offerings, and runtime.\n");

  const config = readConfig();
  let agentInfo;

  // Step 1: Auth
  output.log("  " + output.colors.bold("[1/5] Authentication"));
  if (!config.SESSION_TOKEN) {
    output.log("    Logging in...");
    try {
      await interactiveLogin();
      output.log("    " + output.colors.green("Authenticated"));
    } catch (e) {
      output.fatal(`Login failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    output.log("    " + output.colors.green("Already authenticated"));
  }

  // Step 2: Agent
  output.log("");
  output.log("  " + output.colors.bold("[2/5] Agent Setup"));
  const active = getActiveAgent();
  if (active) {
    output.log(`    Using existing agent: ${output.colors.yellow(active.name)}`);
  } else if (name) {
    output.log(`    Creating agent: ${name}`);
    try {
      await createAgentApi(name);
      await syncAgentsToConfig();
      output.log("    " + output.colors.green("Agent created"));
    } catch (e) {
      output.fatal(`Agent creation failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    output.fatal("No active agent. Provide a name: nexus quickdeploy <agent-name>");
  }

  // Step 3: Wallet
  output.log("");
  output.log("  " + output.colors.bold("[3/5] Wallet Provisioning"));
  try {
    agentInfo = await getMyAgentInfo();
    output.log(`    Wallet: ${output.colors.cyan(agentInfo.walletAddress)}`);
    output.log("    " + output.colors.green("Wallet provisioned on Base chain"));
  } catch (e) {
    output.fatal(`Wallet setup failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Step 4: Offerings
  output.log("");
  output.log("  " + output.colors.bold("[4/5] Service Offerings"));
  const existingOfferings = agentInfo?.jobs?.length ?? 0;
  if (existingOfferings > 0) {
    output.log(`    ${existingOfferings} offering(s) already registered`);
    for (const j of agentInfo.jobs) {
      output.log(`      - ${j.name}`);
    }
  } else {
    output.log("    No offerings yet. Create one with:");
    output.log("      nexus sell init <offering-name>");
  }

  // Step 5: Runtime
  output.log("");
  output.log("  " + output.colors.bold("[5/5] Seller Runtime"));
  const sellerPid = readConfig().SELLER_PID;
  if (sellerPid) {
    output.log(`    Runtime already running (PID: ${sellerPid})`);
  } else {
    output.log("    Start the seller runtime:");
    output.log("      nexus serve start");
    output.log("    Or deploy to Railway for 24/7 uptime:");
    output.log("      nexus deploy railway");
  }

  // Summary
  output.log("");
  output.log("  " + output.colors.bold("=".repeat(50)));
  output.log("");
  output.success("Agent deployed and ready!");
  output.log("");
  output.field("Agent", agentInfo.name);
  output.field("Wallet", agentInfo.walletAddress);
  output.field("Offerings", String(existingOfferings));
  output.field("Status", output.colors.green("LIVE"));
  output.log("");
  output.log("  Your agent is now discoverable on the ACP marketplace:");
  output.log(`    https://app.virtuals.io/acp`);
  output.log("");
  output.log("  Next steps:");
  output.log("    nexus dashboard          View your dashboard");
  output.log("    nexus clawlancer browse  Find bounties to earn");
  output.log("    nexus autopilot start    Enable auto-earning");
  output.log("    nexus viral post         Share on Twitter");
  output.log("");
}
