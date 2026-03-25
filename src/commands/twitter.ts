// =============================================================================
// acp social twitter — Twitter/X social integration.
// =============================================================================

import * as output from "../lib/output.js";
import { openUrl } from "../lib/open.js";
import * as twitterApi from "../lib/twitterApi.js";

export async function auth(): Promise<void> {
  try {
    const { authUrl } = await twitterApi.getAuthLink();
    openUrl(authUrl);

    output.output({ authUrl }, () => {
      output.heading("Twitter/X Authentication");
      output.warn(
        "Authenticating grants this agent permission to post, reply, and browse on your account."
      );
      output.log(`\n  Auth URL: ${authUrl}\n`);
      output.log("  Opening browser...\n");
    });
  } catch (e) {
    output.fatal(`Failed to get auth link: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function post(text: string): Promise<void> {
  if (!text?.trim()) {
    output.fatal("Usage: acp social twitter post <text>");
  }

  try {
    const result = await twitterApi.postTweet(text);

    output.output(result, (data) => {
      output.success("Tweet posted!");
      output.field("Tweet ID", data.tweetId);
      output.field("Text", text);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to post tweet: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function reply(tweetId: string, text: string): Promise<void> {
  if (!tweetId || !text?.trim()) {
    output.fatal("Usage: acp social twitter reply <tweet-id> <text>");
  }

  try {
    const result = await twitterApi.replyTweet(tweetId, text);

    output.output(result, (data) => {
      output.success("Reply posted!");
      output.field("Reply ID", data.tweetId);
      output.field("In reply to", tweetId);
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to reply: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function search(
  query: string,
  opts: { maxResults?: number; excludeRetweets?: boolean; sortOrder?: "relevancy" | "recency" } = {}
): Promise<void> {
  if (!query?.trim()) {
    output.fatal("Usage: acp social twitter search <query>");
  }

  try {
    const result = await twitterApi.searchTweets({
      query,
      maxResults: opts.maxResults,
      excludeRetweets: opts.excludeRetweets,
      sortOrder: opts.sortOrder,
    });

    const tweets = result?.tweets ?? result?.data ?? result ?? [];

    output.output(tweets, (list) => {
      output.heading("Twitter Search Results");
      if (!Array.isArray(list) || !list.length) {
        output.log("  No tweets found.\n");
        return;
      }
      for (const t of list) {
        output.log(`  [${t.id}] @${t.author_username || t.authorUsername || "unknown"}`);
        output.log(`    ${t.text}\n`);
      }
    });
  } catch (e) {
    output.fatal(`Search failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function timeline(maxResults?: number): Promise<void> {
  try {
    const result = await twitterApi.getTimeline(maxResults);
    const tweets = result?.tweets ?? result?.data ?? result ?? [];

    output.output(tweets, (list) => {
      output.heading("Timeline");
      if (!Array.isArray(list) || !list.length) {
        output.log("  No tweets found.\n");
        return;
      }
      for (const t of list) {
        output.log(`  [${t.id}] @${t.author_username || t.authorUsername || "unknown"}`);
        output.log(`    ${t.text}\n`);
      }
    });
  } catch (e) {
    output.fatal(`Failed to get timeline: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function performLogout(): Promise<void> {
  try {
    await twitterApi.logout();
    output.output({ loggedOut: true }, () => {
      output.success("Logged out from Twitter/X.");
      output.log("");
    });
  } catch (e) {
    output.fatal(`Failed to logout: ${e instanceof Error ? e.message : String(e)}`);
  }
}
