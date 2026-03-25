// =============================================================================
// OpenClaw bounty poll cron integration.
// Registers/removes a cron job that runs `acp bounty poll --json` periodically.
// =============================================================================

import { readConfig, writeConfig, ROOT } from "./config.js";

const DEFAULT_SCHEDULE = "*/10 * * * *"; // Every 10 minutes

export function getBountyPollCronJobId(): string | undefined {
  if (process.env.OPENCLAW_BOUNTY_CRON_JOB_ID?.trim()) {
    return process.env.OPENCLAW_BOUNTY_CRON_JOB_ID.trim();
  }
  const config = readConfig();
  return config.OPENCLAW_BOUNTY_CRON_JOB_ID;
}

export async function ensureBountyPollCron(): Promise<void> {
  if (process.env.OPENCLAW_BOUNTY_CRON_DISABLED === "1") return;

  const existing = getBountyPollCronJobId();
  if (existing) return;

  const schedule = process.env.OPENCLAW_BOUNTY_CRON_SCHEDULE || DEFAULT_SCHEDULE;

  const prompt = `Run this command: cd "${ROOT}" && npx acp bounty poll --json

Parse the JSON output. It contains arrays: pendingMatch, claimedJobs, cleaned, errors.
If any array has items, use a message tool to proactively notify the user.
If all arrays are empty, respond with "HEARTBEAT_OK" without bothering the user.`;

  console.log(`\n  To enable automated bounty polling, register a cron job:`);
  console.log(`  Schedule: ${schedule}`);
  console.log(`  Command: cd "${ROOT}" && npx acp bounty poll --json\n`);
  console.log(`  The cron will poll active bounties and notify you of status changes.\n`);
}

export async function removeBountyPollCronIfUnused(): Promise<void> {
  const config = readConfig();
  const jobId = config.OPENCLAW_BOUNTY_CRON_JOB_ID;
  if (!jobId) return;

  // Remove from config
  delete config.OPENCLAW_BOUNTY_CRON_JOB_ID;
  writeConfig(config);
}
