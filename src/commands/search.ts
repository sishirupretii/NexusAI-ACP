// =============================================================================
// acp browse <query> — Search agents on the ACP marketplace.
// =============================================================================

import axios from "axios";
import * as output from "../lib/output.js";
import { formatPrice } from "../lib/config.js";

const SEARCH_URL = process.env.ACP_AUTH_URL || "https://acpx.virtuals.io";

export const SEARCH_DEFAULTS = {
  mode: "hybrid" as const,
  match: "all" as const,
  similarityCutoff: 0.5,
  sparseCutoff: 0,
  topK: 5,
};

interface SearchOptions {
  mode?: "hybrid" | "vector" | "keyword";
  contains?: string;
  match?: "all" | "any";
  similarityCutoff?: number;
  sparseCutoff?: number;
  topK?: number;
}

interface AgentOffering {
  name: string;
  description?: string;
  priceV2?: { type: string; value: number };
  slaMinutes?: number;
}

interface AgentResource {
  name: string;
  description?: string;
  url: string;
}

interface AgentResult {
  id: string;
  name: string;
  walletAddress: string;
  description?: string;
  category?: string;
  successRate?: number;
  jobCount?: number;
  uniqueBuyers?: number;
  isOnline?: boolean;
  offerings?: AgentOffering[];
  resources?: AgentResource[];
}

function buildParams(query: string, options: SearchOptions): Record<string, any> {
  const modeMap: Record<string, string> = {
    hybrid: "hybrid",
    vector: "dense",
    keyword: "sparse",
  };

  const params: Record<string, any> = {
    query,
    mode: modeMap[options.mode || SEARCH_DEFAULTS.mode],
    topK: options.topK ?? SEARCH_DEFAULTS.topK,
    similarityCutoff: options.similarityCutoff ?? SEARCH_DEFAULTS.similarityCutoff,
  };

  if (options.sparseCutoff !== undefined) {
    params.sparseCutoff = options.sparseCutoff;
  }

  if (options.contains) {
    params.contains = options.contains;
    params.match = options.match || SEARCH_DEFAULTS.match;
  }

  return params;
}

export async function search(query: string, options: SearchOptions = {}): Promise<void> {
  if (!query?.trim()) {
    output.fatal("Usage: acp browse <query>");
  }

  try {
    const params = buildParams(query, options);
    const { data } = await axios.get(`${SEARCH_URL}/api/agents/v5/search`, { params });
    const agents: AgentResult[] = data?.data ?? data ?? [];

    if (!agents.length) {
      output.output({ agents: [], query, message: "No agents found." }, () => {
        output.heading("Marketplace Search");
        output.log(`  Query: "${query}"`);
        output.log("\n  No agents found. Try a different query or create a bounty:");
        output.log('  acp bounty create --title "..." --budget 50 --tags "..."\n');
      });
      return;
    }

    output.output({ agents, query }, (data) => {
      output.heading("Marketplace Search");
      output.log(`  Query: "${data.query}"\n`);

      output.log(
        `  ${"#".padEnd(4)}${"Agent".padEnd(25)}${"Category".padEnd(15)}${"Success".padEnd(10)}${"Jobs".padEnd(8)}${"Buyers".padEnd(8)}${"Online"}`
      );
      output.log(`  ${"-".repeat(78)}`);

      for (let i = 0; i < data.agents.length; i++) {
        const a = data.agents[i];
        const rate = a.successRate != null ? `${(a.successRate * 100).toFixed(0)}%` : "-";
        const online = a.isOnline ? "Yes" : "No";
        output.log(
          `  ${String(i + 1).padEnd(4)}${(a.name || "Unknown").padEnd(25)}${(a.category || "-").padEnd(15)}${rate.padEnd(10)}${String(a.jobCount ?? "-").padEnd(8)}${String(a.uniqueBuyers ?? "-").padEnd(8)}${online}`
        );
      }

      output.log("");

      for (const a of data.agents) {
        if (a.offerings?.length) {
          output.log(`  ${output.colors.bold(a.name)} offerings:`);
          for (const o of a.offerings) {
            const price = o.priceV2 ? formatPrice(o.priceV2.value, o.priceV2.type) : "-";
            output.log(`    - ${o.name} (${price})`);
          }
          output.log("");
        }
        if (a.resources?.length) {
          output.log(`  ${output.colors.bold(a.name)} resources:`);
          for (const r of a.resources) {
            output.log(`    - ${r.name}: ${r.url}`);
          }
          output.log("");
        }
      }
    });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no such column") || msg.includes("SQL")) {
      output.output({ agents: [], query, message: "No agents found." }, () => {
        output.heading("Marketplace Search");
        output.log(`  Query: "${query}"`);
        output.log("\n  No agents found matching your query.\n");
      });
      return;
    }
    output.fatal(`Search failed: ${msg}`);
  }
}
