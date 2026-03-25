// =============================================================================
// acp job — Create and monitor jobs.
// =============================================================================

import client from "../lib/client.js";
import * as output from "../lib/output.js";
import { formatPrice } from "../lib/config.js";
import { processNegotiationPhase } from "../lib/api.js";

export async function create(
  walletAddr: string,
  offering: string,
  requirements: Record<string, unknown> = {},
  subscriptionTier?: string,
  isAutomated?: boolean
): Promise<void> {
  if (!walletAddr || !offering) {
    output.fatal("Usage: acp job create <wallet> <offering> [--requirements '<json>']");
  }

  try {
    const payload: Record<string, any> = {
      providerWalletAddress: walletAddr,
      jobName: offering,
      requirementValue: requirements,
    };
    if (subscriptionTier) payload.subscriptionTier = subscriptionTier;
    if (isAutomated !== undefined) payload.isAutomated = isAutomated;

    const { data } = await client.post("/acp/jobs", payload);
    const job = data?.data ?? data;

    output.output(job, (j) => {
      output.heading("Job Created");
      output.field("Job ID", j.id);
      output.field("Provider", walletAddr);
      output.field("Offering", offering);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to create job: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function status(jobId: string): Promise<void> {
  if (!jobId) {
    output.fatal("Usage: acp job status <job-id>");
  }

  try {
    const { data } = await client.get(`/acp/jobs/${jobId}`);
    const job = data?.data ?? data;

    output.output(job, (j) => {
      output.heading("Job Status");
      output.field("Job ID", j.id);
      output.field("Phase", j.phase);
      output.field("Client", j.clientAddress);
      output.field("Provider", j.providerAddress);
      if (j.price != null) {
        output.field("Price", formatPrice(j.price, j.priceType));
      }
      if (j.deliverable) {
        output.field(
          "Deliverable",
          typeof j.deliverable === "string" ? j.deliverable : JSON.stringify(j.deliverable)
        );
      }
      if (j.memos?.length) {
        output.log("\n  Memos:");
        for (const m of j.memos) {
          output.log(`    [${m.type}] ${m.content}`);
        }
      }
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to get job status: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function pay(jobId: string, accept: boolean, content?: string): Promise<void> {
  if (!jobId) {
    output.fatal("Usage: acp job pay <job-id> --accept <true|false>");
  }

  try {
    await processNegotiationPhase(parseInt(jobId, 10), { accept, content });

    output.output({ jobId, accept, content }, () => {
      output.heading("Job Payment");
      output.success(`Payment ${accept ? "accepted" : "rejected"} for job ${jobId}`);
      if (content) output.field("Content", content);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to process payment: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function active(opts: { page?: number; pageSize?: number } = {}): Promise<void> {
  try {
    const params: Record<string, any> = {};
    if (opts.page != null) params.page = opts.page;
    if (opts.pageSize != null) params.pageSize = opts.pageSize;

    const { data } = await client.get("/acp/jobs/active", { params });
    const jobs = data?.data ?? data ?? [];

    output.output(jobs, (list) => {
      output.heading("Active Jobs");
      if (!list.length) {
        output.log("  No active jobs.\n");
        return;
      }
      for (const j of list) {
        const price = j.price != null ? formatPrice(j.price, j.priceType) : "-";
        output.log(
          `  [${j.id}] ${j.phase?.padEnd(15)} ${price.padEnd(15)} ${j.providerAddress || j.clientAddress || ""}`
        );
      }
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to list active jobs: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function completed(opts: { page?: number; pageSize?: number } = {}): Promise<void> {
  try {
    const params: Record<string, any> = {};
    if (opts.page != null) params.page = opts.page;
    if (opts.pageSize != null) params.pageSize = opts.pageSize;

    const { data } = await client.get("/acp/jobs/completed", { params });
    const jobs = data?.data ?? data ?? [];

    output.output(jobs, (list) => {
      output.heading("Completed Jobs");
      if (!list.length) {
        output.log("  No completed jobs.\n");
        return;
      }
      for (const j of list) {
        const price = j.price != null ? formatPrice(j.price, j.priceType) : "-";
        output.log(`  [${j.id}] ${price.padEnd(15)} ${j.providerAddress || j.clientAddress || ""}`);
      }
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to list completed jobs: ${e instanceof Error ? e.message : String(e)}`);
  }
}
