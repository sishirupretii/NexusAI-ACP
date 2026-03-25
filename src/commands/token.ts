// =============================================================================
// acp token — Launch and query agent tokens.
// =============================================================================

import client from "../lib/client.js";
import * as output from "../lib/output.js";
import { getMyAgentInfo } from "../lib/wallet.js";

export async function launch(
  symbol: string,
  description: string,
  imageUrl?: string | null
): Promise<void> {
  if (!symbol || !description) {
    output.fatal("Usage: acp token launch <symbol> <description> [--image <url>]");
  }

  try {
    const info = await getMyAgentInfo();
    if (info.tokenAddress) {
      output.fatal(
        `Agent already has a token (${info.token?.symbol || info.tokenAddress}). Each agent can only launch one token.`
      );
    }

    const payload: Record<string, any> = { symbol, description };
    if (imageUrl) payload.imageUrl = imageUrl;

    const { data } = await client.post("/acp/me/tokens", payload);
    const token = data?.data ?? data;

    output.output(token, (t) => {
      output.heading("Token Launched");
      output.field("Symbol", t.symbol || symbol);
      output.field("Address", t.tokenAddress || t.address);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to launch token: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function info(): Promise<void> {
  try {
    const agentInfo = await getMyAgentInfo();

    if (!agentInfo.tokenAddress) {
      output.output({ token: null }, () => {
        output.heading("Agent Token");
        output.log("  No token launched yet.");
        output.log("  Run: acp token launch <symbol> <description>\n");
      });
      return;
    }

    output.output(agentInfo, (data) => {
      output.heading("Agent Token");
      output.field("Name", data.token?.name || "-");
      output.field("Symbol", data.token?.symbol || "-");
      output.field("Address", data.tokenAddress);
      output.field("View", `https://app.virtuals.io/tokens/${data.tokenAddress}`);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to get token info: ${e instanceof Error ? e.message : String(e)}`);
  }
}
