// =============================================================================
// Seller runtime entrypoint.
// Connects to ACP socket, listens for jobs, executes offering handlers.
// =============================================================================

import dotenv from "dotenv";
dotenv.config();

import { writePidToConfig, removePidFromConfig, sanitizeAgentName } from "../../lib/config.js";
import { requireActiveAgent, getMyAgentInfo } from "../../lib/wallet.js";
import { connectAcpSocket } from "./acpSocket.js";
import { loadOffering, listOfferings } from "./offerings.js";
import { acceptOrRejectJob, requestPayment, deliverJob, checkSubscription } from "./sellerApi.js";
import { AcpJobPhase, type AcpJobEventData } from "./types.js";

const ACP_SOCKET_URL = process.env.ACP_SOCKET_URL || "https://acpx.virtuals.io";

async function resolveOfferingName(
  jobData: AcpJobEventData,
  agentInfo: any
): Promise<string | null> {
  // Try to match from memos or context
  const memos = jobData.memos ?? [];
  for (const m of memos) {
    if (m.type === "REQUIREMENT" && m.content) {
      try {
        const parsed = JSON.parse(m.content);
        if (parsed.jobName) return parsed.jobName;
      } catch {
        // Not JSON
      }
    }
  }

  // Try to match from registered offerings
  const jobs = agentInfo?.jobs ?? [];
  if (jobs.length === 1) return jobs[0].name;

  return null;
}

async function handleNewTask(
  job: AcpJobEventData,
  agentDirName: string,
  agentInfo: any
): Promise<void> {
  const jobId = job.id;
  const phase = job.phase;

  console.log(`[seller] Processing job ${jobId} in phase ${phase}`);

  if (phase === AcpJobPhase.REQUEST) {
    const offeringName = await resolveOfferingName(job, agentInfo);
    if (!offeringName) {
      console.log(`[seller] Cannot resolve offering for job ${jobId}, rejecting.`);
      await acceptOrRejectJob(jobId, { accept: false, reason: "Unknown offering" });
      return;
    }

    try {
      const offering = await loadOffering(offeringName, agentDirName);

      // Validate requirements if handler exists
      if (offering.handlers.validateRequirements) {
        const requirements = job.context ?? {};
        const validation = await offering.handlers.validateRequirements(requirements);
        const isValid = typeof validation === "boolean" ? validation : validation.valid;
        if (!isValid) {
          const reason =
            typeof validation === "object" && validation.reason
              ? validation.reason
              : "Requirements validation failed";
          await acceptOrRejectJob(jobId, { accept: false, reason });
          return;
        }
      }

      // Accept the job
      await acceptOrRejectJob(jobId, { accept: true });
      console.log(`[seller] Accepted job ${jobId} for offering "${offeringName}"`);

      // Request payment
      const paymentContent = `Payment requested for ${offeringName}`;
      await requestPayment(jobId, { content: paymentContent });
    } catch (e) {
      console.error(`[seller] Error handling job ${jobId}:`, e);
      await acceptOrRejectJob(jobId, {
        accept: false,
        reason: e instanceof Error ? e.message : "Internal error",
      });
    }
  } else if (phase === AcpJobPhase.TRANSACTION) {
    const offeringName = await resolveOfferingName(job, agentInfo);
    if (!offeringName) {
      console.error(`[seller] Cannot resolve offering for job ${jobId} in TRANSACTION phase`);
      return;
    }

    try {
      const offering = await loadOffering(offeringName, agentDirName);
      const requirements = job.context ?? {};

      console.log(`[seller] Executing job ${jobId}...`);
      const result = await offering.handlers.executeJob(requirements);

      // Deliver the result
      await deliverJob(jobId, {
        deliverable: result.result,
        payable: result.payable,
      });

      console.log(`[seller] Job ${jobId} delivered successfully.`);
    } catch (e) {
      console.error(`[seller] Error executing job ${jobId}:`, e);
      await deliverJob(jobId, {
        deliverable: `Error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }
}

async function main(): Promise<void> {
  // Record PID
  writePidToConfig(process.pid);

  const agent = await requireActiveAgent();
  const agentDirName = sanitizeAgentName(agent.name);
  const agentInfo = await getMyAgentInfo();

  const availableOfferings = listOfferings(agentDirName);
  console.log(`[seller] Agent: ${agent.name} (${agent.walletAddress})`);
  console.log(`[seller] Available offerings: ${availableOfferings.join(", ") || "(none)"}`);

  // Connect to ACP socket
  const cleanup = connectAcpSocket({
    acpUrl: ACP_SOCKET_URL,
    walletAddress: agent.walletAddress,
    callbacks: {
      onNewTask: (job) => {
        handleNewTask(job, agentDirName, agentInfo).catch((e) => {
          console.error(`[seller] Unhandled error processing job ${job.id}:`, e);
        });
      },
    },
  });

  console.log(`[seller] Seller runtime started. Listening for jobs...`);

  // Graceful shutdown
  const shutdown = () => {
    console.log("[seller] Shutting down...");
    cleanup();
    removePidFromConfig();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("uncaughtException", (e) => {
    console.error("[seller] Uncaught exception:", e);
    shutdown();
  });
  process.on("unhandledRejection", (e) => {
    console.error("[seller] Unhandled rejection:", e);
    shutdown();
  });
}

main().catch((e) => {
  console.error("[seller] Fatal:", e);
  removePidFromConfig();
  process.exit(1);
});
