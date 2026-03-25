// =============================================================================
// acp bounty — Manage bounty lifecycle.
// =============================================================================

import readline from "readline";
import * as output from "../lib/output.js";
import {
  createBounty as createBountyApi,
  getBountyDetails,
  getBountyMatchStatus,
  confirmBountyMatch,
  updateBountyApi,
  cancelBountyApi,
  listActiveBounties,
  getActiveBounty,
  saveActiveBounty,
  removeActiveBounty,
  normalizeCandidate,
  type ActiveBounty,
} from "../lib/bounty.js";
import { ensureBountyPollCron, removeBountyPollCronIfUnused } from "../lib/openclawCron.js";
import client from "../lib/client.js";

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

interface CreateFlags {
  title?: string;
  description?: string;
  budget?: number;
  category?: string;
  tags?: string;
  sourceChannel?: string;
}

export async function create(query?: string, flags: CreateFlags = {}): Promise<void> {
  let title = flags.title;
  let description = flags.description;
  let budget = flags.budget;
  let category = flags.category || "digital";
  let tags = flags.tags;

  // Interactive mode if no title/budget flags
  if (!title && !budget) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      title = (await question(rl, `  Bounty title${query ? ` [${query}]` : ""}: `)).trim() || query;
      if (!title) {
        output.fatal("Title is required.");
      }
      description = (await question(rl, "  Description: ")).trim() || title;
      const budgetStr = (await question(rl, "  Budget (USD): ")).trim();
      budget = budgetStr ? Number(budgetStr) : undefined;
      tags = (await question(rl, "  Tags (comma-separated): ")).trim() || undefined;
    } finally {
      rl.close();
    }
  }

  if (!title) {
    output.fatal("Title is required (--title or interactive).");
  }

  try {
    const result = await createBountyApi({
      title,
      description: description || title,
      budget,
      category,
      tags,
      sourceChannel: flags.sourceChannel,
    });

    const bountyId = result?.id || result?.bountyId;
    const posterSecret = result?.posterSecret || result?.poster_secret;

    if (bountyId) {
      const activeBounty: ActiveBounty = {
        id: bountyId,
        title,
        description,
        budget,
        posterSecret: posterSecret || "",
        createdAt: new Date().toISOString(),
        status: "open",
      };
      saveActiveBounty(activeBounty);

      await ensureBountyPollCron();
    }

    output.output({ bountyId, title, budget, status: "open" }, () => {
      output.success(`Bounty created: ${title}`);
      if (bountyId) output.field("Bounty ID", bountyId);
      if (budget) output.field("Budget", `${budget} USD`);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to create bounty: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function poll(): Promise<void> {
  const bounties = listActiveBounties();
  if (!bounties.length) {
    output.output({ pendingMatch: [], claimedJobs: [], cleaned: [], errors: [] }, () => {
      output.log("  No active bounties to poll.\n");
    });
    return;
  }

  const pendingMatch: any[] = [];
  const claimedJobs: any[] = [];
  const cleaned: any[] = [];
  const errors: any[] = [];

  for (const bounty of bounties) {
    try {
      const status = await getBountyMatchStatus(bounty.id);
      const candidates = (status.candidates ?? []).map(normalizeCandidate);

      if (
        status.status === "pending_match" &&
        candidates.length > 0 &&
        !bounty.notifiedPendingMatch
      ) {
        pendingMatch.push({ bountyId: bounty.id, title: bounty.title, candidates });
        bounty.notifiedPendingMatch = true;
        bounty.status = "pending_match";
        saveActiveBounty(bounty);
      } else if (["fulfilled", "expired", "cancelled"].includes(status.status)) {
        cleaned.push({ bountyId: bounty.id, status: status.status });
        removeActiveBounty(bounty.id);
      } else if (bounty.acpJobId) {
        claimedJobs.push({ bountyId: bounty.id, acpJobId: bounty.acpJobId });
      }
    } catch (e) {
      errors.push({ bountyId: bounty.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  // Remove cron if no bounties left
  if (listActiveBounties().length === 0) {
    await removeBountyPollCronIfUnused();
  }

  output.output({ pendingMatch, claimedJobs, cleaned, errors }, () => {
    if (pendingMatch.length) {
      output.heading("Pending Matches");
      for (const pm of pendingMatch) {
        output.log(`  Bounty: ${pm.title} (${pm.bountyId})`);
        output.log(`  Candidates: ${pm.candidates.length}`);
        output.log(`  Run: acp bounty select ${pm.bountyId}\n`);
      }
    }
    if (claimedJobs.length) {
      output.log(`  Active jobs: ${claimedJobs.length}`);
    }
    if (cleaned.length) {
      output.log(`  Cleaned: ${cleaned.length} bounties`);
    }
    if (errors.length) {
      for (const e of errors) {
        output.warn(`Bounty ${e.bountyId}: ${e.error}`);
      }
    }
    if (!pendingMatch.length && !claimedJobs.length && !cleaned.length && !errors.length) {
      output.log("  HEARTBEAT_OK\n");
    }
  });
}

export async function list(): Promise<void> {
  const bounties = listActiveBounties();

  output.output(bounties, (list) => {
    output.heading("Active Bounties");
    if (!list.length) {
      output.log("  No active bounties.\n");
      return;
    }
    for (const b of list) {
      output.log(`  [${b.id}] ${b.title} (${b.status}) ${b.budget ? `$${b.budget}` : ""}`);
    }
    output.log("");
  });
}

export async function status(bountyId: string, opts: { sync?: boolean } = {}): Promise<void> {
  if (!bountyId) {
    output.fatal("Usage: acp bounty status <bounty-id>");
  }

  try {
    const details = await getBountyDetails(bountyId);
    const matchStatus = await getBountyMatchStatus(bountyId);

    output.output({ ...details, matchStatus }, (data) => {
      output.heading("Bounty Status");
      output.field("ID", bountyId);
      output.field("Status", data.status || matchStatus.status);
      output.field("Title", data.title);
      if (data.budget) output.field("Budget", `${data.budget} USD`);
      if (matchStatus.candidates?.length) {
        output.log("\n  Candidates:");
        for (const c of matchStatus.candidates.map(normalizeCandidate)) {
          output.log(`    - ${c.name || c.id} (${c.wallet_address || "-"})`);
        }
      }
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to get bounty status: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function select(bountyId: string): Promise<void> {
  if (!bountyId) {
    output.fatal("Usage: acp bounty select <bounty-id>");
  }

  const local = getActiveBounty(bountyId);
  if (!local) {
    output.fatal(`Bounty ${bountyId} not found in active bounties.`);
  }

  try {
    const matchStatus = await getBountyMatchStatus(bountyId);
    const candidates = (matchStatus.candidates ?? []).map(normalizeCandidate);

    if (!candidates.length) {
      output.fatal("No candidates available for selection.");
    }

    // Auto-select first candidate if only one
    let selected = candidates[0];
    if (candidates.length > 1) {
      output.log("\n  Available candidates:\n");
      for (let i = 0; i < candidates.length; i++) {
        output.log(`    [${i + 1}] ${candidates[i].name || candidates[i].id}`);
      }
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const choice = await question(rl, `\n  Select [1-${candidates.length}]: `);
      rl.close();
      const idx = parseInt(choice.trim(), 10) - 1;
      if (idx >= 0 && idx < candidates.length) selected = candidates[idx];
    }

    const candidateId = selected.id!;

    // Confirm with bounty API
    await confirmBountyMatch(bountyId, candidateId, local.posterSecret);

    // Create ACP job
    const walletAddr = selected.wallet_address;
    if (walletAddr) {
      const { data } = await client.post("/acp/jobs", {
        providerWalletAddress: walletAddr,
        jobName: local.title,
        requirementValue: { bountyId },
      });
      const jobId = data?.data?.id;

      local.selectedCandidate = candidateId;
      local.acpJobId = jobId;
      local.status = "claimed";
      saveActiveBounty(local);

      output.output({ bountyId, candidateId, jobId }, () => {
        output.success(`Selected candidate and created job.`);
        output.field("Candidate", selected.name || candidateId);
        if (jobId) output.field("ACP Job", String(jobId));
        output.log("");
      });
    } else {
      output.success(`Selected candidate: ${selected.name || candidateId}`);
    }
  } catch (e) {
    output.fatal(`Failed to select candidate: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function update(
  bountyId: string,
  updates: { title?: string; description?: string; budget?: number; tags?: string }
): Promise<void> {
  if (!bountyId) {
    output.fatal("Usage: acp bounty update <bounty-id> [--title ...] [--budget ...]");
  }

  try {
    await updateBountyApi(bountyId, updates);

    // Update local state
    const local = getActiveBounty(bountyId);
    if (local) {
      if (updates.title) local.title = updates.title;
      if (updates.description) local.description = updates.description;
      if (updates.budget) local.budget = updates.budget;
      saveActiveBounty(local);
    }

    output.output({ bountyId, ...updates }, () => {
      output.success(`Bounty ${bountyId} updated.`);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to update bounty: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function cancel(bountyId: string): Promise<void> {
  if (!bountyId) {
    output.fatal("Usage: acp bounty cancel <bounty-id>");
  }

  try {
    await cancelBountyApi(bountyId);
    removeActiveBounty(bountyId);

    if (listActiveBounties().length === 0) {
      await removeBountyPollCronIfUnused();
    }

    output.output({ bountyId, cancelled: true }, () => {
      output.success(`Bounty ${bountyId} cancelled.`);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to cancel bounty: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function cleanup(bountyId: string): Promise<void> {
  if (!bountyId) {
    output.fatal("Usage: acp bounty cleanup <bounty-id>");
  }

  removeActiveBounty(bountyId);

  if (listActiveBounties().length === 0) {
    await removeBountyPollCronIfUnused();
  }

  output.output({ bountyId, cleaned: true }, () => {
    output.success(`Local bounty state cleaned for ${bountyId}.`);
    output.log("");
  });
}
