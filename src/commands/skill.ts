// =============================================================================
// nexus skill — Install, list, and manage skills/offerings from GitHub repos.
// =============================================================================

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import * as output from "../lib/output.js";
import { ROOT, sanitizeAgentName } from "../lib/config.js";
import { requireActiveAgent } from "../lib/wallet.js";

const SKILLS_DIR = path.resolve(ROOT, "installed-skills");
const SKILLS_MANIFEST_PATH = path.resolve(SKILLS_DIR, "manifest.json");

interface InstalledSkill {
  name: string;
  repo: string;
  installedAt: string;
  path: string;
}

function loadManifest(): InstalledSkill[] {
  if (!fs.existsSync(SKILLS_MANIFEST_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(SKILLS_MANIFEST_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveManifest(skills: InstalledSkill[]): void {
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
  fs.writeFileSync(SKILLS_MANIFEST_PATH, JSON.stringify(skills, null, 2) + "\n");
}

function extractRepoName(url: string): string {
  // Handle: https://github.com/org/repo, git@github.com:org/repo.git, org/repo
  const match = url.match(/(?:github\.com[:/])?([\w-]+)\/([\w-]+?)(?:\.git)?$/);
  if (match) return match[2];
  return url.replace(/[^a-z0-9-]/gi, "-");
}

export async function install(repoUrl: string): Promise<void> {
  if (!repoUrl?.trim()) {
    output.fatal("Usage: nexus skill install <github-url-or-repo>");
  }

  // Normalize URL
  let gitUrl = repoUrl;
  if (!gitUrl.includes("://") && !gitUrl.includes("@")) {
    gitUrl = `https://github.com/${gitUrl}`;
  }
  if (!gitUrl.endsWith(".git")) {
    gitUrl = gitUrl.replace(/\/$/, "");
  }

  const repoName = extractRepoName(repoUrl);
  const skillDir = path.join(SKILLS_DIR, repoName);

  // Check if already installed
  const manifest = loadManifest();
  if (manifest.find((s) => s.name === repoName)) {
    output.warn(`Skill "${repoName}" is already installed at ${skillDir}`);
    output.log("  To reinstall, remove it first: nexus skill remove " + repoName + "\n");
    return;
  }

  output.log(`\n  Installing skill from ${gitUrl}...\n`);

  try {
    // Clone the repo
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    execSync(`git clone --depth 1 "${gitUrl}" "${skillDir}"`, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Install dependencies if package.json exists
    if (fs.existsSync(path.join(skillDir, "package.json"))) {
      output.log("  Installing dependencies...");
      execSync("npm install", { cwd: skillDir, stdio: ["pipe", "pipe", "pipe"] });
    }

    // Check for offerings
    const offeringsDir = path.join(skillDir, "src", "seller", "offerings");
    let offeringCount = 0;
    if (fs.existsSync(offeringsDir)) {
      const items = fs.readdirSync(offeringsDir, { withFileTypes: true });
      offeringCount = items.filter((i) => i.isDirectory()).length;
    }

    // Check for SKILL.md
    const skillMdPath = path.join(skillDir, "SKILL.md");
    const hasSkillMd = fs.existsSync(skillMdPath);

    // Save to manifest
    manifest.push({
      name: repoName,
      repo: gitUrl,
      installedAt: new Date().toISOString(),
      path: skillDir,
    });
    saveManifest(manifest);

    // Optionally copy offerings to local agent
    let copiedOfferings: string[] = [];
    if (offeringCount > 0) {
      try {
        const agent = await requireActiveAgent();
        const agentDir = sanitizeAgentName(agent.name);
        const localOfferingsDir = path.join(ROOT, "src", "seller", "offerings", agentDir);
        fs.mkdirSync(localOfferingsDir, { recursive: true });

        const agentDirs = fs.readdirSync(offeringsDir, { withFileTypes: true });
        for (const agentDirEntry of agentDirs) {
          if (!agentDirEntry.isDirectory()) continue;
          const srcAgentDir = path.join(offeringsDir, agentDirEntry.name);
          const offerings = fs.readdirSync(srcAgentDir, { withFileTypes: true });
          for (const offeringEntry of offerings) {
            if (!offeringEntry.isDirectory()) continue;
            const srcDir = path.join(srcAgentDir, offeringEntry.name);
            const destDir = path.join(localOfferingsDir, offeringEntry.name);
            if (!fs.existsSync(destDir)) {
              fs.cpSync(srcDir, destDir, { recursive: true });
              copiedOfferings.push(offeringEntry.name);
            }
          }
        }
      } catch {
        // No active agent — skip copying
      }
    }

    output.output(
      {
        name: repoName,
        repo: gitUrl,
        path: skillDir,
        offerings: offeringCount,
        hasSkillMd,
        copiedOfferings,
      },
      (data) => {
        output.success(`Skill "${repoName}" installed!`);
        output.field("Path", data.path);
        if (data.offerings > 0) {
          output.field("Offerings found", String(data.offerings));
        }
        if (data.copiedOfferings?.length) {
          output.log("");
          output.log("  Offerings copied to your agent:");
          for (const o of data.copiedOfferings) {
            output.log(`    - ${o}`);
          }
          output.log("");
          output.log("  Register them with:");
          for (const o of data.copiedOfferings) {
            output.log(`    acp sell create ${o}`);
          }
        }
        if (data.hasSkillMd) {
          output.log("");
          output.log("  Skill instructions: " + path.join(skillDir, "SKILL.md"));
        }
        output.log("");
      }
    );
  } catch (e: any) {
    // Clean up on failure
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }
    output.fatal(`Install failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function list(): Promise<void> {
  const manifest = loadManifest();

  output.output(manifest, (skills) => {
    output.heading("Installed Skills");
    if (!skills.length) {
      output.log("  No skills installed.");
      output.log("  Install one: nexus skill install <github-url>\n");
      output.log("  Popular skills:");
      output.log("    nexus skill install Virtual-Protocol/openclaw-acp");
      output.log("");
      return;
    }
    output.log("");
    for (const s of skills) {
      output.log(`  ${output.colors.bold(s.name)}`);
      output.field("  Repo", s.repo);
      output.field("  Installed", new Date(s.installedAt).toLocaleDateString());
      output.field("  Path", s.path);
      output.log("");
    }
  });
}

export async function remove(name: string): Promise<void> {
  if (!name?.trim()) {
    output.fatal("Usage: nexus skill remove <skill-name>");
  }

  const manifest = loadManifest();
  const skill = manifest.find((s) => s.name === name);

  if (!skill) {
    output.fatal(
      `Skill "${name}" is not installed. Run \`nexus skill list\` to see installed skills.`
    );
  }

  // Remove directory
  if (fs.existsSync(skill.path)) {
    fs.rmSync(skill.path, { recursive: true, force: true });
  }

  // Update manifest
  const updated = manifest.filter((s) => s.name !== name);
  saveManifest(updated);

  output.output({ name, removed: true }, () => {
    output.success(`Skill "${name}" removed.`);
    output.log("");
  });
}
