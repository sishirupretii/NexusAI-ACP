// =============================================================================
// Shared type definitions for offering handler contracts.
// =============================================================================

export interface TransferInstruction {
  contractAddress: string;
  amount: string;
}

export interface ExecuteJobResult {
  result: string | Record<string, any>;
  payable?: TransferInstruction[];
}

export type ValidationResult = boolean | { valid: boolean; reason?: string };

export interface OfferingHandlers {
  executeJob(requirements: Record<string, any>): Promise<ExecuteJobResult> | ExecuteJobResult;

  validateRequirements?(
    requirements: Record<string, any>
  ): Promise<ValidationResult> | ValidationResult;

  requestPayment?(
    requirements: Record<string, any>
  ): Promise<{ content: string; amount?: number }> | { content: string; amount?: number };

  requestAdditionalFunds?(requirements: Record<string, any>):
    | Promise<{
        content: string;
        amount: number;
        tokenAddress: string;
        recipient: string;
      }>
    | {
        content: string;
        amount: number;
        tokenAddress: string;
        recipient: string;
      };
}
