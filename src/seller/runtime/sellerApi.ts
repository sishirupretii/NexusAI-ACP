// =============================================================================
// Seller/provider API calls for job lifecycle.
// =============================================================================

import client from "../../lib/client.js";

export interface AcceptRejectParams {
  accept: boolean;
  reason?: string;
}

export interface PaymentRequestParams {
  content: string;
  payable?: {
    amount: number;
    tokenAddress?: string;
    recipient?: string;
  };
}

export interface DeliverJobParams {
  deliverable: string | Record<string, any>;
  payable?: {
    contractAddress: string;
    amount: string;
  }[];
}

export interface SubscriptionCheckResult {
  isSubscribed: boolean;
  tier?: {
    name: string;
    price: number;
    duration: number;
  };
}

export async function acceptOrRejectJob(jobId: number, params: AcceptRejectParams): Promise<void> {
  console.log(`[seller] ${params.accept ? "Accepting" : "Rejecting"} job ${jobId}`);
  await client.post(`/acp/providers/jobs/${jobId}/accept`, params);
}

export async function requestPayment(jobId: number, params: PaymentRequestParams): Promise<void> {
  await client.post(`/acp/providers/jobs/${jobId}/requirement`, params);
}

export async function checkSubscription(
  clientAddress: string,
  providerAddress: string,
  offeringName: string
): Promise<SubscriptionCheckResult> {
  const { data } = await client.get("/acp/subscriptions", {
    params: { clientAddress, providerAddress, offeringName },
  });
  return data?.data ?? data;
}

export async function deliverJob(jobId: number, params: DeliverJobParams): Promise<void> {
  console.log(`[seller] Delivering job ${jobId}`);
  const deliverable =
    typeof params.deliverable === "string"
      ? params.deliverable
      : JSON.stringify(params.deliverable);

  await client.post(`/acp/providers/jobs/${jobId}/deliverable`, {
    deliverable,
    payable: params.payable,
  });
}
