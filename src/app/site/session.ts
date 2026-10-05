import type { VerificationReport } from "../../core/types";
export interface SessionOverview {
  hasIntent: boolean;
  hasTransaction: boolean;
  verdict?: VerificationReport["verdict"];
}
