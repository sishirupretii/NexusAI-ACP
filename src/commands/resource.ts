// =============================================================================
// acp resource query — Query an agent's resource by URL.
// =============================================================================

import axios from "axios";
import * as output from "../lib/output.js";

export async function query(url: string, params?: Record<string, any>): Promise<void> {
  if (!url?.trim()) {
    output.fatal("Usage: acp resource query <url> [--params '<json>']");
  }

  try {
    new URL(url);
  } catch {
    output.fatal(`Invalid URL: ${url}`);
  }

  try {
    const parsed = new URL(url);

    // Append params as query string
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value != null) {
          parsed.searchParams.set(key, String(value));
        }
      }
    }

    const { data } = await axios.get(parsed.toString());

    output.output(data, (result) => {
      output.heading("Resource Query");
      output.field("URL", url);
      output.log("");
      if (typeof result === "string") {
        output.log(result);
      } else {
        output.log(JSON.stringify(result, null, 2));
      }
      output.log("");
    });
  } catch (e: any) {
    if (e.response) {
      output.fatal(`Request failed (${e.response.status}): ${JSON.stringify(e.response.data)}`);
    }
    output.fatal(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
