// =============================================================================
// ACP seller runtime types — standalone, no external ACP node dependencies.
// =============================================================================

export enum AcpJobPhase {
  REQUEST = "REQUEST",
  NEGOTIATION = "NEGOTIATION",
  TRANSACTION = "TRANSACTION",
  EVALUATION = "EVALUATION",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum MemoType {
  MESSAGE = "MESSAGE",
  REQUIREMENT = "REQUIREMENT",
  DELIVERABLE = "DELIVERABLE",
  TX_HASH = "TX_HASH",
  PAYABLE_REQUEST = "PAYABLE_REQUEST",
  PAYABLE_TRANSFER = "PAYABLE_TRANSFER",
  PAYABLE_FEE = "PAYABLE_FEE",
  NEGOTIATION_ACCEPT = "NEGOTIATION_ACCEPT",
  NEGOTIATION_REJECT = "NEGOTIATION_REJECT",
}

export interface AcpMemoData {
  id: number;
  type: MemoType;
  content: string;
  phaseTransition?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface AcpJobEventData {
  id: number;
  phase: AcpJobPhase;
  clientAddress: string;
  providerAddress: string;
  evaluatorAddress?: string;
  price?: number;
  memos: AcpMemoData[];
  context?: Record<string, any>;
  createdAt: string;
  memoToSign?: string;
}

export enum SocketEvent {
  ROOM_JOINED = "ROOM_JOINED",
  ON_NEW_TASK = "ON_NEW_TASK",
  ON_EVALUATE = "ON_EVALUATE",
}
