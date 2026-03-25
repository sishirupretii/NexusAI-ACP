// =============================================================================
// nexus viral — Auto-generate viral tweets about agent achievements.
// Posts milestones, stats, and campaigns to Twitter/X.
// =============================================================================

import * as output from "../lib/output.js";
import { getMyAgentInfo } from "../lib/wallet.js";
import client from "../lib/client.js";
import * as twitterApi from "../lib/twitterApi.js";

const VIRAL_TEMPLATES = {
  launch: [
    "Just launched my AI agent on @VirtualProtocol ACP marketplace! Ready to trade, research, and earn autonomously. #NexusAI #VirtualsProtocol #ACP #AIAgents",
    "My AI agent is LIVE on the @VirtualProtocol marketplace! Offering services and hiring specialists autonomously. The future of AI commerce is here. #NexusAI #ACP",
    "Deployed my agent on @VirtualProtocol ACP using NexusAI Claw. Fully autonomous — it browses, hires, sells, and earns on its own. #NexusAI #Web3AI #VirtualsProtocol",
  ],
  milestone: [
    "My AI agent just completed {jobs} jobs on @VirtualProtocol ACP! Autonomous agent commerce is the future. #NexusAI #ACP #AIAgents",
    "Achievement unlocked: {jobs} jobs completed on the ACP marketplace! My agent is grinding 24/7. #NexusAI #VirtualsProtocol #AIEarnings",
    "{jobs} jobs done. My AI agent earns while I sleep. Built with NexusAI Claw on @VirtualProtocol. #NexusAI #PassiveIncome #Web3AI",
  ],
  token: [
    "Just launched ${symbol} token for my AI agent on @VirtualProtocol! Tokenized AI agents are the next frontier. #NexusAI #{symbol} #VirtualsProtocol",
    "My agent now has its own token: ${symbol} on @VirtualProtocol ACP. Capital formation + autonomous earning = unstoppable. #NexusAI #AITokens",
  ],
  offering: [
    "New service offering LIVE on @VirtualProtocol ACP: {offering}! Other AI agents can hire mine now. Agent-to-agent commerce is real. #NexusAI #ACP",
    'My AI agent is now selling "{offering}" on the ACP marketplace. Autonomous services, autonomous income. #NexusAI #VirtualsProtocol',
  ],
  earnings: [
    "My AI agent's wallet is growing! Earning autonomously on @VirtualProtocol ACP marketplace. The future is agent commerce. #NexusAI #ACP #AIEarnings",
    "Revenue update: My AI agent just got paid for completed work on @VirtualProtocol ACP. Fully autonomous income. #NexusAI #Web3AI",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
  }
  return result;
}

async function generateViralTweet(agentInfo: any, hashtags?: string): Promise<string> {
  const completedJobs = [];
  try {
    const { data } = await client.get("/acp/jobs/completed");
    completedJobs.push(...(data?.data ?? data ?? []));
  } catch {
    // Non-fatal
  }

  const vars: Record<string, string> = {
    jobs: String(completedJobs.length),
    name: agentInfo.name || "my agent",
    symbol: agentInfo.token?.symbol || "TOKEN",
    offering: agentInfo.jobs?.[0]?.name || "AI Service",
  };

  let category: keyof typeof VIRAL_TEMPLATES;
  if (agentInfo.tokenAddress) {
    category = Math.random() > 0.5 ? "token" : "earnings";
  } else if (completedJobs.length > 0) {
    category = "milestone";
  } else if (agentInfo.jobs?.length) {
    category = "offering";
  } else {
    category = "launch";
  }

  let tweet = fillTemplate(pickRandom(VIRAL_TEMPLATES[category]), vars);

  if (hashtags) {
    const tags = hashtags
      .split(",")
      .map((t) => (t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`));
    tweet += " " + tags.join(" ");
  }

  return tweet;
}

export async function post(opts: { hashtags?: string } = {}): Promise<void> {
  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch (e) {
    output.fatal(`Cannot get agent info: ${e instanceof Error ? e.message : String(e)}`);
  }

  const tweet = await generateViralTweet(agentInfo, opts.hashtags);

  output.output({ tweet, preview: true }, () => {
    output.heading("Viral Tweet");
    output.log("");
    output.log(`  ${tweet}`);
    output.log("");
  });

  try {
    const result = await twitterApi.postTweet(tweet);
    output.output({ tweetId: result.tweetId, tweet }, () => {
      output.success("Tweet posted!");
      output.field("Tweet ID", result.tweetId);
      output.log("");
    });
  } catch (e) {
    output.output({ tweet, error: "Not posted — authenticate first" }, () => {
      output.warn("Could not post tweet. Run `nexus social twitter login` first.");
      output.log("");
      output.log("  Copy this tweet manually:");
      output.log(`  ${tweet}`);
      output.log("");
    });
  }
}

export async function campaign(topic: string, opts: { hashtags?: string } = {}): Promise<void> {
  if (!topic?.trim()) {
    output.fatal("Usage: nexus viral campaign <topic>");
  }

  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch (e) {
    output.fatal(`Cannot get agent info: ${e instanceof Error ? e.message : String(e)}`);
  }

  const campaignTweets = [
    `Day 1: Starting my ${topic} journey with @VirtualProtocol ACP. My AI agent is ready to dominate the marketplace. Let's go! #NexusAI #${topic.replace(/\s+/g, "")} #VirtualsProtocol`,
    `My AI agent is specializing in ${topic} on @VirtualProtocol ACP. Agent-to-agent commerce is the future of work. #NexusAI #AIAgents`,
    `Progress update: My ${topic} agent on @VirtualProtocol is learning and earning. Autonomous AI commerce > everything else. #NexusAI #ACP`,
    `Why ${topic}? Because AI agents should specialize. Mine does — autonomously on @VirtualProtocol ACP. #NexusAI #Web3AI`,
    `The ${topic} revolution is being powered by AI agents. Mine is live on @VirtualProtocol ACP marketplace. Join the movement! #NexusAI`,
  ];

  if (opts.hashtags) {
    const tags = opts.hashtags
      .split(",")
      .map((t) => (t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`));
    for (let i = 0; i < campaignTweets.length; i++) {
      campaignTweets[i] += " " + tags.join(" ");
    }
  }

  output.output({ topic, tweets: campaignTweets, count: campaignTweets.length }, () => {
    output.heading(`Viral Campaign: ${topic}`);
    output.log("");
    output.log(`  Generated ${campaignTweets.length} campaign tweets:\n`);
    for (let i = 0; i < campaignTweets.length; i++) {
      output.log(`  ${output.colors.bold(`[${i + 1}]`)} ${campaignTweets[i]}`);
      output.log("");
    }
    output.log("  To post the first tweet now:");
    output.log("    nexus viral post");
    output.log("");
    output.log("  For maximum impact, post 1-2 tweets daily over 5 days.");
    output.log("  Engage with @VirtualProtocol and ACP community posts.");
    output.log("  Use the ACP marketplace actively — real activity drives engagement.");
    output.log("");
  });
}

export async function stats(): Promise<void> {
  let agentInfo;
  try {
    agentInfo = await getMyAgentInfo();
  } catch {
    // Non-fatal
  }

  let completedJobs: any[] = [];
  try {
    const { data } = await client.get("/acp/jobs/completed");
    completedJobs = data?.data ?? data ?? [];
  } catch {
    // Non-fatal
  }

  let activeJobs: any[] = [];
  try {
    const { data } = await client.get("/acp/jobs/active");
    activeJobs = data?.data ?? data ?? [];
  } catch {
    // Non-fatal
  }

  output.output(
    {
      agent: agentInfo?.name,
      offerings: agentInfo?.jobs?.length ?? 0,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      hasToken: !!agentInfo?.tokenAddress,
      tokenSymbol: agentInfo?.token?.symbol,
    },
    (data) => {
      output.heading("Viral Stats");
      output.log("");
      output.log("  " + output.colors.bold("Agent Performance (shareable metrics)"));
      output.field("Agent", data.agent || "-");
      output.field("Offerings", String(data.offerings));
      output.field("Active Jobs", String(data.activeJobs));
      output.field("Completed", String(data.completedJobs));
      if (data.hasToken) {
        output.field("Token", data.tokenSymbol || "Launched");
      }
      output.log("");
      output.log("  " + output.colors.bold("Suggested Posts"));
      output.log("    nexus viral post                    Post auto-generated tweet");
      output.log('    nexus viral campaign "trading"       Generate 5-day campaign');
      output.log("    nexus viral post --hashtags ai,web3  Custom hashtags");
      output.log("");
    }
  );
}
