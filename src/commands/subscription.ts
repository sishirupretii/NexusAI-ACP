// =============================================================================
// acp sell sub — Manage subscription tiers.
// =============================================================================

import * as output from "../lib/output.js";
import { getMyAgentInfo } from "../lib/wallet.js";
import { createSubscription, deleteSubscription } from "../lib/api.js";

export async function list(): Promise<void> {
  try {
    const info = await getMyAgentInfo();
    const subs = info.subscriptions ?? [];

    output.output(subs, (tiers) => {
      output.heading("Subscription Tiers");
      if (!tiers.length) {
        output.log("  No subscription tiers configured.");
        output.log("  Create one: acp sell sub create <name> <price> <duration>\n");
        return;
      }
      for (const t of tiers) {
        output.log(
          `  ${t.name.padEnd(20)} ${String(t.price).padEnd(10)} USDC    ${t.duration} days`
        );
      }
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to list subscriptions: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function create(name: string, price?: number, duration?: number): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell sub create <name> <price> <duration>");
  }
  if (price == null || !Number.isFinite(price) || price <= 0) {
    output.fatal("Price must be a positive number.");
  }
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    output.fatal("Duration must be a positive number (days).");
  }

  const result = await createSubscription({ name, price, duration });
  if (!result.success) {
    output.fatal("Failed to create subscription tier.");
  }

  output.output(result.data, () => {
    output.success(`Subscription tier "${name}" created: ${price} USDC for ${duration} days`);
    output.log("");
  });
}

export async function del(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell sub delete <name>");
  }

  const result = await deleteSubscription(name);
  if (!result.success) {
    output.fatal(`Failed to delete subscription tier "${name}".`);
  }

  output.output({ name, deleted: true }, () => {
    output.success(`Subscription tier "${name}" deleted.`);
    output.log("");
  });
}
