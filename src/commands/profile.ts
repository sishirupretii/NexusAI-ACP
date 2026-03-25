// =============================================================================
// acp profile — Show and update agent profile.
// =============================================================================

import client from "../lib/client.js";
import * as output from "../lib/output.js";
import { getMyAgentInfo } from "../lib/wallet.js";
import { formatPrice } from "../lib/config.js";

export async function show(): Promise<void> {
  try {
    const info = await getMyAgentInfo();

    output.output(info, (data) => {
      output.heading("Agent Profile");
      output.field("Name", data.name);
      output.field("Description", data.description || "(none)");
      output.field("Wallet", data.walletAddress);
      output.field(
        "Token",
        data.token?.symbol
          ? `${data.token.symbol} (${data.tokenAddress})`
          : data.tokenAddress || "(none)"
      );

      if (data.jobs?.length) {
        output.log("\n  Offerings:");
        for (const j of data.jobs) {
          const price = j.priceV2 ? formatPrice(j.priceV2.value, j.priceV2.type) : "-";
          output.log(`    - ${j.name} (${price}, SLA: ${j.slaMinutes}min)`);
        }
      }
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to get profile: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function update(key: string, value: string): Promise<void> {
  const allowed = ["name", "description", "profilePic"];
  if (!allowed.includes(key)) {
    output.fatal(`Supported keys: ${allowed.join(", ")}`);
  }
  if (!value?.trim()) {
    output.fatal(`Usage: acp profile update ${key} <value>`);
  }

  try {
    await client.put("/acp/me", { [key]: value });
    output.output({ key, value }, () => {
      output.success(`Updated ${key} to: ${value}`);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to update profile: ${e instanceof Error ? e.message : String(e)}`);
  }
}
