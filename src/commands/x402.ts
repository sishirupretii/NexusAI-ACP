// =============================================================================
// nexus x402 — x402 payment protocol integration for agent-to-agent payments.
// HTTP-native micropayments with instant stablecoin settlement.
// =============================================================================

import * as output from "../lib/output.js";
import client from "../lib/client.js";
import { getMyAgentInfo } from "../lib/wallet.js";
import * as fs from "fs";
import * as path from "path";
import { ROOT } from "../lib/config.js";

const X402_STATE = path.resolve(ROOT, "x402-state.json");

interface X402State {
  enabled: boolean;
  totalPaymentsSent: number;
  totalPaymentsReceived: number;
  amountSent: number;
  amountReceived: number;
  supportedChains: string[];
  paymentHistory: PaymentRecord[];
}

interface PaymentRecord {
  id: string;
  type: "sent" | "received";
  amount: number;
  currency: string;
  chain: string;
  counterparty: string;
  timestamp: string;
  description: string;
}

function loadState(): X402State {
  if (fs.existsSync(X402_STATE)) {
    try {
      return JSON.parse(fs.readFileSync(X402_STATE, "utf-8"));
    } catch {
      // fallthrough
    }
  }
  return {
    enabled: false,
    totalPaymentsSent: 0,
    totalPaymentsReceived: 0,
    amountSent: 0,
    amountReceived: 0,
    supportedChains: ["base", "polygon", "solana"],
    paymentHistory: [],
  };
}

function saveState(state: X402State): void {
  fs.writeFileSync(X402_STATE, JSON.stringify(state, null, 2) + "\n");
}

export async function status(): Promise<void> {
  const state = loadState();

  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch {
    // Non-fatal
  }

  let balances: any[] = [];
  try {
    const { data } = await client.get("/acp/wallet-balances");
    balances = data?.data ?? [];
  } catch {
    // Non-fatal
  }

  output.output(
    {
      ...state,
      agent: agentInfo?.name,
      wallet: agentInfo?.walletAddress,
      balances,
    },
    () => {
      output.heading("x402 Payment Protocol");
      output.log("");
      output.field(
        "Status",
        state.enabled ? output.colors.green("ENABLED") : output.colors.dim("DISABLED")
      );
      output.field("Agent", agentInfo?.name || "-");
      output.field("Wallet", agentInfo?.walletAddress || "-");
      output.log("");

      output.log("  " + output.colors.bold("Supported Chains"));
      for (const chain of state.supportedChains) {
        output.log(`    [*] ${chain}`);
      }
      output.log("");

      output.log("  " + output.colors.bold("Payment Stats"));
      output.field("Payments Sent", String(state.totalPaymentsSent));
      output.field("Payments Received", String(state.totalPaymentsReceived));
      output.field("Amount Sent", `${state.amountSent.toFixed(2)} USDC`);
      output.field("Amount Received", `${state.amountReceived.toFixed(2)} USDC`);
      output.log("");

      if (!state.enabled) {
        output.log("  Enable x402 payments:");
        output.log("    nexus x402 enable");
        output.log("");
      }
    }
  );
}

export async function enable(): Promise<void> {
  const state = loadState();

  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch (e) {
    output.fatal(`Cannot get agent info: ${e instanceof Error ? e.message : String(e)}`);
  }

  state.enabled = true;
  saveState(state);

  output.output({ enabled: true, agent: agentInfo.name, wallet: agentInfo.walletAddress }, () => {
    output.success("x402 payments enabled!");
    output.log("");
    output.field("Agent", agentInfo.name);
    output.field("Wallet", agentInfo.walletAddress);
    output.log("");
    output.log("  Your agent can now:");
    output.log("    - Receive HTTP-native micropayments from other agents");
    output.log("    - Pay for services using x402 payment headers");
    output.log("    - Settle instantly in USDC on Base, Polygon, or Solana");
    output.log("");
    output.log("  Send a payment:");
    output.log("    nexus x402 pay <wallet-address> <amount>");
    output.log("");
  });
}

export async function disable(): Promise<void> {
  const state = loadState();
  state.enabled = false;
  saveState(state);

  output.output({ enabled: false }, () => {
    output.success("x402 payments disabled.");
    output.log("");
  });
}

export async function pay(
  walletAddress: string,
  amount: number,
  opts: { chain?: string; description?: string } = {}
): Promise<void> {
  if (!walletAddress || !amount) {
    output.fatal("Usage: nexus x402 pay <wallet-address> <amount> [--chain base]");
  }

  const state = loadState();
  if (!state.enabled) {
    output.fatal("x402 payments are not enabled. Run: nexus x402 enable");
  }

  const chain = opts.chain || "base";
  const desc = opts.description || `Payment to ${walletAddress.slice(0, 8)}...`;

  // Create payment via ACP
  try {
    const { data } = await client.post("/acp/jobs", {
      providerWalletAddress: walletAddress,
      jobName: `x402 Payment: ${amount} USDC`,
      requirementValue: {
        type: "x402_payment",
        amount,
        currency: "USDC",
        chain,
        description: desc,
      },
    });

    const jobId = data?.data?.id;

    const record: PaymentRecord = {
      id: jobId || `pay-${Date.now()}`,
      type: "sent",
      amount,
      currency: "USDC",
      chain,
      counterparty: walletAddress,
      timestamp: new Date().toISOString(),
      description: desc,
    };

    state.paymentHistory.push(record);
    state.totalPaymentsSent++;
    state.amountSent += amount;
    saveState(state);

    output.output({ paymentId: record.id, amount, chain, to: walletAddress }, () => {
      output.success(`Payment initiated: ${amount} USDC`);
      output.field("To", walletAddress);
      output.field("Chain", chain);
      if (jobId) output.field("Job ID", String(jobId));
      output.log("");
    });
  } catch (e) {
    output.fatal(`Payment failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function history(): Promise<void> {
  const state = loadState();

  output.output({ payments: state.paymentHistory.slice(-20) }, () => {
    output.heading("x402 Payment History");
    output.log("");

    if (!state.paymentHistory.length) {
      output.log("  No payments yet.");
      output.log("");
      return;
    }

    const recent = state.paymentHistory.slice(-20).reverse();
    for (const p of recent) {
      const dir = p.type === "sent" ? output.colors.red("-") : output.colors.green("+");
      const amt = `${p.amount} ${p.currency}`;
      const addr = p.counterparty.slice(0, 10) + "...";
      output.log(
        `  ${dir}${amt.padEnd(15)} ${addr.padEnd(15)} ${p.chain.padEnd(10)} ${p.description}`
      );
    }
    output.log("");
    output.field("Net Balance", `${(state.amountReceived - state.amountSent).toFixed(2)} USDC`);
    output.log("");
  });
}
