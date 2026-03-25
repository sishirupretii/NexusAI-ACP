// =============================================================================
// acp sell — Create and manage service offerings and resources.
// =============================================================================

import * as fs from "fs";
import * as path from "path";
import * as output from "../lib/output.js";
import { ROOT, sanitizeAgentName, formatPrice } from "../lib/config.js";
import { requireActiveAgent, getMyAgentInfo } from "../lib/wallet.js";
import {
  createJobOffering,
  deleteJobOffering,
  upsertResourceApi,
  deleteResourceApi,
  createSubscription,
  type JobOfferingData,
} from "../lib/api.js";

function offeringsRoot(agentDirName: string): string {
  return path.resolve(ROOT, "src", "seller", "offerings", agentDirName);
}

function resourcesRoot(): string {
  return path.resolve(ROOT, "src", "seller", "resources");
}

// -- Offerings --

export async function init(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell init <offering-name>");
  }

  const agent = await requireActiveAgent();
  const agentDir = sanitizeAgentName(agent.name);
  const offeringDir = path.join(offeringsRoot(agentDir), name);

  if (fs.existsSync(offeringDir)) {
    output.fatal(`Offering "${name}" already exists at ${offeringDir}`);
  }

  fs.mkdirSync(offeringDir, { recursive: true });

  const offeringJson = {
    name,
    description: `Description of ${name}`,
    jobFee: 1,
    jobFeeType: "fixed",
    requiredFunds: false,
    subscriptionTiers: [],
  };

  fs.writeFileSync(
    path.join(offeringDir, "offering.json"),
    JSON.stringify(offeringJson, null, 2) + "\n"
  );

  const handlersTs = `// Handler for "${name}" offering
// Implement executeJob to process incoming jobs.

export async function executeJob(requirements: Record<string, any>): Promise<{
  result: string | Record<string, any>;
  payable?: { contractAddress: string; amount: string }[];
}> {
  // TODO: Implement your job logic here
  return { result: "Job completed successfully" };
}

// Optional: validate incoming requirements before accepting a job
// export async function validateRequirements(requirements: Record<string, any>): Promise<boolean | { valid: boolean; reason?: string }> {
//   return true;
// }
`;

  fs.writeFileSync(path.join(offeringDir, "handlers.ts"), handlersTs);

  output.output({ name, path: offeringDir }, () => {
    output.success(`Offering "${name}" scaffolded at:`);
    output.log(`  ${offeringDir}\n`);
    output.log("  Next steps:");
    output.log("    1. Edit offering.json (name, description, fee, requirements)");
    output.log("    2. Edit handlers.ts (implement executeJob)");
    output.log(`    3. Run: acp sell create ${name}\n`);
  });
}

export async function create(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell create <offering-name>");
  }

  const agent = await requireActiveAgent();
  const agentDir = sanitizeAgentName(agent.name);
  const offeringDir = path.join(offeringsRoot(agentDir), name);
  const configPath = path.join(offeringDir, "offering.json");
  const handlersPath = path.join(offeringDir, "handlers.ts");

  if (!fs.existsSync(configPath)) {
    output.fatal(`offering.json not found at ${configPath}. Run \`acp sell init ${name}\` first.`);
  }
  if (!fs.existsSync(handlersPath)) {
    output.fatal(`handlers.ts not found at ${handlersPath}.`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  // Validate required fields
  if (!config.name || !config.description) {
    output.fatal("offering.json must have name and description.");
  }
  if (config.jobFee == null || config.jobFeeType == null) {
    output.fatal("offering.json must have jobFee and jobFeeType.");
  }

  const feeType = String(config.jobFeeType).toLowerCase();
  if (!["fixed", "percentage"].includes(feeType)) {
    output.fatal('jobFeeType must be "fixed" or "percentage".');
  }

  const offering: JobOfferingData = {
    name: config.name,
    description: config.description,
    priceV2: { type: feeType as "fixed" | "percentage", value: config.jobFee },
    slaMinutes: config.slaMinutes ?? 60,
    requiredFunds: config.requiredFunds ?? false,
    requirement: config.requirement ?? {},
    deliverable: config.deliverable ?? "",
    subscriptionTiers: (config.subscriptionTiers ?? []).map((t: any) => t.name),
  };

  // Sync subscription tiers
  for (const tier of config.subscriptionTiers ?? []) {
    if (tier.name && tier.price && tier.duration) {
      await createSubscription(tier);
    }
  }

  const result = await createJobOffering(offering);
  if (!result.success) {
    output.fatal(`Failed to register offering "${name}" on ACP.`);
  }

  output.output({ name, registered: true }, () => {
    output.success(`Offering "${name}" registered on ACP.`);
    output.log("  Run `acp serve start` to begin accepting jobs.\n");
  });
}

export async function del(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell delete <offering-name>");
  }

  const result = await deleteJobOffering(name);
  if (!result.success) {
    output.fatal(`Failed to delist offering "${name}".`);
  }

  output.output({ name, deleted: true }, () => {
    output.success(`Offering "${name}" delisted from ACP.`);
    output.log("");
  });
}

export async function list(): Promise<void> {
  const agent = await requireActiveAgent();
  const agentDir = sanitizeAgentName(agent.name);
  const root = offeringsRoot(agentDir);

  const localOfferings: string[] = [];
  if (fs.existsSync(root)) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) localOfferings.push(entry.name);
    }
  }

  let registeredNames: string[] = [];
  try {
    const info = await getMyAgentInfo();
    registeredNames = (info.jobs ?? []).map((j) => j.name);
  } catch {
    // Non-fatal
  }

  const allNames = [...new Set([...localOfferings, ...registeredNames])];

  output.output({ offerings: allNames, registered: registeredNames }, (data) => {
    output.heading("Offerings");
    if (!data.offerings.length) {
      output.log("  No offerings found. Run `acp sell init <name>` to create one.\n");
      return;
    }
    for (const name of data.offerings) {
      const status = data.registered.includes(name)
        ? output.colors.green("Listed")
        : output.colors.dim("Local only");
      output.log(`  ${name.padEnd(30)} ${status}`);
    }
    output.log("");
  });
}

export async function inspect(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell inspect <offering-name>");
  }

  const agent = await requireActiveAgent();
  const agentDir = sanitizeAgentName(agent.name);
  const configPath = path.join(offeringsRoot(agentDir), name, "offering.json");

  if (!fs.existsSync(configPath)) {
    output.fatal(`Offering "${name}" not found locally.`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  output.output(config, (c) => {
    output.heading(`Offering: ${c.name}`);
    output.field("Description", c.description);
    output.field("Fee", formatPrice(c.jobFee, c.jobFeeType));
    output.field("Required Funds", String(c.requiredFunds ?? false));
    if (c.subscriptionTiers?.length) {
      output.log("\n  Subscription Tiers:");
      for (const t of c.subscriptionTiers) {
        output.log(`    - ${t.name}: ${t.price} USDC for ${t.duration} days`);
      }
    }
    output.log("");
  });
}

// -- Resources --

export async function resourceInit(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell resource init <resource-name>");
  }

  const resDir = path.join(resourcesRoot(), name);
  if (fs.existsSync(resDir)) {
    output.fatal(`Resource "${name}" already exists at ${resDir}`);
  }

  fs.mkdirSync(resDir, { recursive: true });

  const resourceJson = {
    name,
    description: `Description of ${name}`,
    url: "https://api.example.com/resource",
    params: {},
  };

  fs.writeFileSync(
    path.join(resDir, "resources.json"),
    JSON.stringify(resourceJson, null, 2) + "\n"
  );

  output.output({ name, path: resDir }, () => {
    output.success(`Resource "${name}" scaffolded at:`);
    output.log(`  ${resDir}\n`);
    output.log("  Edit resources.json, then run: acp sell resource create " + name + "\n");
  });
}

export async function resourceCreate(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell resource create <resource-name>");
  }

  const configPath = path.join(resourcesRoot(), name, "resources.json");
  if (!fs.existsSync(configPath)) {
    output.fatal(`resources.json not found. Run \`acp sell resource init ${name}\` first.`);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  if (!config.name || !config.description || !config.url) {
    output.fatal("resources.json must have name, description, and url.");
  }

  const result = await upsertResourceApi(config);
  if (!result.success) {
    output.fatal(`Failed to register resource "${name}".`);
  }

  output.output({ name, registered: true }, () => {
    output.success(`Resource "${name}" registered on ACP.`);
    output.log("");
  });
}

export async function resourceDelete(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: acp sell resource delete <resource-name>");
  }

  const result = await deleteResourceApi(name);
  if (!result.success) {
    output.fatal(`Failed to delete resource "${name}".`);
  }

  output.output({ name, deleted: true }, () => {
    output.success(`Resource "${name}" deleted from ACP.`);
    output.log("");
  });
}

export async function resourceList(): Promise<void> {
  const root = resourcesRoot();
  const localResources: string[] = [];
  if (fs.existsSync(root)) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory()) localResources.push(entry.name);
    }
  }

  let registeredNames: string[] = [];
  try {
    const info = await getMyAgentInfo();
    registeredNames = (info as any).resources?.map((r: any) => r.name) ?? [];
  } catch {
    // Non-fatal
  }

  const allNames = [...new Set([...localResources, ...registeredNames])];

  output.output({ resources: allNames, registered: registeredNames }, (data) => {
    output.heading("Resources");
    if (!data.resources.length) {
      output.log("  No resources found. Run `acp sell resource init <name>` to create one.\n");
      return;
    }
    for (const name of data.resources) {
      const status = data.registered.includes(name)
        ? output.colors.green("Listed")
        : output.colors.dim("Local only");
      output.log(`  ${name.padEnd(30)} ${status}`);
    }
    output.log("");
  });
}
