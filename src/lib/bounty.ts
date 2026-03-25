// =============================================================================
// Bounty API client and local state management.
// =============================================================================

import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { ROOT, loadApiKey } from "./config.js";

const BOUNTY_API_URL = process.env.ACP_BOUNTY_API_URL || "https://bounty.virtuals.io";
const ACTIVE_BOUNTIES_PATH = path.resolve(ROOT, "active-bounties.json");

// -- Types --

export interface BountyCreateInput {
  posterEmail?: string;
  title: string;
  description?: string;
  budget?: number;
  category?: string;
  tags?: string;
  sourceChannel?: string;
}

export interface ActiveBounty {
  id: string;
  title: string;
  description?: string;
  budget?: number;
  posterSecret: string;
  createdAt: string;
  status: string;
  selectedCandidate?: string;
  acpJobId?: string;
  notifiedPendingMatch?: boolean;
}

export interface BountyCandidate {
  id?: string;
  candidate_id?: string;
  candidateId?: string;
  name?: string;
  wallet_address?: string;
  walletAddress?: string;
  score?: number;
}

export interface BountyMatchStatusResponse {
  status: string;
  candidates?: BountyCandidate[];
}

// -- API helpers --

function bountyClient() {
  const apiKey = loadApiKey();
  return axios.create({
    baseURL: BOUNTY_API_URL,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey || "",
    },
  });
}

function extractData(response: any): any {
  return response?.data?.data ?? response?.data ?? response;
}

// -- Bounty API --

export async function createBounty(input: BountyCreateInput): Promise<any> {
  const { data } = await bountyClient().post("/api/bounties", input);
  return extractData(data);
}

export async function getBountyDetails(bountyId: string): Promise<any> {
  const { data } = await bountyClient().get(`/api/bounties/${bountyId}`);
  return extractData(data);
}

export async function getBountyMatchStatus(bountyId: string): Promise<BountyMatchStatusResponse> {
  const { data } = await bountyClient().get(`/api/bounties/${bountyId}/match-status`);
  return extractData(data);
}

export async function confirmBountyMatch(
  bountyId: string,
  candidateId: string,
  posterSecret: string
): Promise<any> {
  const { data } = await bountyClient().post(`/api/bounties/${bountyId}/confirm-match`, {
    candidateId,
    posterSecret,
  });
  return extractData(data);
}

export async function updateBountyApi(
  bountyId: string,
  updates: { title?: string; description?: string; budget?: number; tags?: string }
): Promise<any> {
  const { data } = await bountyClient().patch(`/api/bounties/${bountyId}`, updates);
  return extractData(data);
}

export async function cancelBountyApi(bountyId: string): Promise<any> {
  const { data } = await bountyClient().post(`/api/bounties/${bountyId}/cancel`);
  return extractData(data);
}

export async function rejectCandidateApi(bountyId: string, candidateId: string): Promise<any> {
  const { data } = await bountyClient().post(`/api/bounties/${bountyId}/reject-candidate`, {
    candidateId,
  });
  return extractData(data);
}

// -- Local state management --

export function listActiveBounties(): ActiveBounty[] {
  if (!fs.existsSync(ACTIVE_BOUNTIES_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(ACTIVE_BOUNTIES_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export function getActiveBounty(bountyId: string): ActiveBounty | undefined {
  return listActiveBounties().find((b) => b.id === bountyId);
}

export function saveActiveBounty(bounty: ActiveBounty): void {
  const bounties = listActiveBounties();
  const idx = bounties.findIndex((b) => b.id === bounty.id);
  if (idx >= 0) {
    bounties[idx] = bounty;
  } else {
    bounties.push(bounty);
  }
  fs.writeFileSync(ACTIVE_BOUNTIES_PATH, JSON.stringify(bounties, null, 2) + "\n");
}

export function removeActiveBounty(bountyId: string): void {
  const bounties = listActiveBounties().filter((b) => b.id !== bountyId);
  fs.writeFileSync(ACTIVE_BOUNTIES_PATH, JSON.stringify(bounties, null, 2) + "\n");
}

/** Normalize candidate field names across different API response formats. */
export function normalizeCandidate(c: any): BountyCandidate {
  return {
    id: c.id || c.candidate_id || c.candidateId,
    name: c.name,
    wallet_address: c.wallet_address || c.walletAddress,
    score: c.score,
  };
}
