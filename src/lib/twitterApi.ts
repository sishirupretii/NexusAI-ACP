// =============================================================================
// Twitter/X API wrappers through the ACP client.
// =============================================================================

import client from "./client.js";

export async function getAuthLink(): Promise<{ authUrl: string }> {
  const { data } = await client.get("/acp/social/twitter/auth-url");
  return data.data;
}

export async function onboard(purpose?: string): Promise<any> {
  const { data } = await client.post("/acp/social/twitter/onboard", { purpose });
  return data.data;
}

export async function postTweet(text: string): Promise<{ tweetId: string }> {
  const { data } = await client.post("/acp/social/twitter/tweet", { text });
  return data.data;
}

export async function replyTweet(tweetId: string, text: string): Promise<{ tweetId: string }> {
  const { data } = await client.post("/acp/social/twitter/reply", { tweetId, text });
  return data.data;
}

export interface SearchTweetsParams {
  query: string;
  maxResults?: number;
  excludeRetweets?: boolean;
  sortOrder?: "relevancy" | "recency";
  startTime?: string;
  endTime?: string;
  nextToken?: string;
  sinceId?: string;
  untilId?: string;
  tweetFields?: string[];
  userFields?: string[];
  mediaFields?: string[];
  expansions?: string[];
}

export async function searchTweets(params: SearchTweetsParams): Promise<any> {
  const queryParams: Record<string, any> = { query: params.query };
  if (params.maxResults) queryParams.maxResults = params.maxResults;
  if (params.excludeRetweets) queryParams.excludeRetweets = true;
  if (params.sortOrder) queryParams.sortOrder = params.sortOrder;
  if (params.startTime) queryParams.startTime = params.startTime;
  if (params.endTime) queryParams.endTime = params.endTime;
  if (params.nextToken) queryParams.nextToken = params.nextToken;

  // Filter undefined values
  const cleanParams = Object.fromEntries(
    Object.entries(queryParams).filter(([_, v]) => v !== undefined)
  );

  const { data } = await client.get("/acp/social/twitter/search", { params: cleanParams });
  return data.data;
}

export async function getTimeline(maxResults?: number): Promise<any> {
  const params: Record<string, any> = {};
  if (maxResults) params.maxResults = maxResults;
  const { data } = await client.get("/acp/social/twitter/timeline", { params });
  return data.data;
}

export async function logout(): Promise<void> {
  await client.post("/acp/social/twitter/logout");
}
