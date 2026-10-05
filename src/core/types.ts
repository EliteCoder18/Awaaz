export type Locale = "hi-IN" | "en-IN";
export type SpeechSource = "speech" | "edited" | "preset";
export interface SpeechResult {
  transcript: string;
  locale: Locale;
  confidence?: number;
  source: SpeechSource;
}
export type IntentAmbiguityCode =
  | "MISSING_RECIPIENT"
  | "AMBIGUOUS_RECIPIENT"
  | "MISSING_AMOUNT"
  | "MISSING_UNIT"
  | "UNSUPPORTED_AMOUNT"
  | "MULTIPLE_AMOUNTS"
  | "NEGATED_INSTRUCTION"
  | "UNSUPPORTED_LANGUAGE";
export interface IntentAmbiguity {
  code: IntentAmbiguityCode;
  detail: string;
}
export interface PaymentIntent {
  transcript: string;
  locale: Locale;
  recipientAlias?: string;
  expectedScriptHexes: string[];
  amountSats?: bigint;
  ambiguities: IntentAmbiguity[];
}
export interface VerificationPolicy {
  maxFeeSats: bigint;
  revision: number;
}
export interface ConfirmedIntent extends PaymentIntent {
  context?: PaymentContext;
  recipientAlias: string;
  recipientScriptHex: string;
  amountSats: bigint;
  policy: VerificationPolicy;
  revision: number;
  confirmed: true;
}
export interface PaymentContext {
  purpose: string;
  relationship: "known" | "new" | "unsure";
  independentlyVerified: boolean;
}
export interface ContextNotice {
  code: "URGENCY" | "NEW_RECIPIENT" | "IDENTITY_UNCHECKED";
  text: string;
}
export interface AddressBookEntry {
  id: string;
  displayName: string;
  aliases: string[];
  scriptHexes: string[];
  address?: string;
}
export type OutputClassification =
  "recipient" | "change" | "unknown" | "op_return";
export interface TransactionOutput {
  index: number;
  valueSats: bigint;
  scriptHex: string;
  displayAddress?: string;
  classification: OutputClassification;
}
export interface ValidatedInput {
  index: number;
  outpoint: string;
  scriptHex?: string;
  valueSats?: bigint;
  sequence: number;
  evidenceStatus: "validated" | "claimed" | "missing";
}
export type ParseWarningCode =
  | "MISSING_INPUT_VALUE"
  | "OP_RETURN_PRESENT"
  | "UNSUPPORTED_PSBT_VERSION"
  | "MISSING_PREVOUT_EVIDENCE"
  | "UNSUPPORTED_INPUT"
  | "UNSUPPORTED_SIGHASH"
  | "UNSUPPORTED_TIMELOCK";
export interface ParseWarning {
  code: ParseWarningCode;
  detail: string;
}
export interface TransactionFacts {
  networkContext: "testnet";
  outputs: TransactionOutput[];
  inputs?: ValidatedInput[];
  inputTotalSats?: bigint;
  outputTotalSats: bigint;
  feeSats?: bigint;
  warnings: ParseWarning[];
  evidenceComplete?: boolean;
  version?: number;
  locktime?: number;
  replaceable?: boolean;
}
export type VerificationIssueCode =
  | "INTENT_AMBIGUOUS"
  | "INTENT_UNCONFIRMED"
  | "RECIPIENT_MISMATCH"
  | "AMOUNT_MISMATCH"
  | "UNKNOWN_OUTPUT"
  | "LOOKALIKE_ADDRESS"
  | "FEE_UNAVAILABLE"
  | "INVALID_FEE"
  | "FEE_CAP_EXCEEDED"
  | "INVALID_FACTS"
  | "PROFILE_CONFLICT"
  | "MISSING_PREVOUT_EVIDENCE"
  | "UNSUPPORTED_PSBT_VERSION"
  | "UNSUPPORTED_INPUT"
  | "UNSUPPORTED_SIGHASH"
  | "UNSUPPORTED_TIMELOCK"
  | "UNSUPPORTED_OUTPUT"
  | "PARSE_FAILED";
export interface VerificationIssue {
  code: VerificationIssueCode;
  severity: "warning" | "danger";
  expected?: string;
  actual?: string;
}
export interface VerificationReport {
  context?: PaymentContext;
  verdict: "MATCH" | "MISMATCH" | "INCOMPLETE";
  issues: VerificationIssue[];
  summaryKey: string;
  speakableParameters: Record<string, string>;
  notices?: string[];
}
export interface LocalizedReport {
  title: string;
  instruction: string;
  details: string[];
  speech: string;
  readback?: string[];
  // AI explanation that passed the Number Lock, or why it was blocked.
  explanation?: string;
  lock?: "verified" | "blocked";
}
export interface WalletProfile {
  networkContext: "testnet";
  addressBook: AddressBookEntry[];
  knownChangeScriptHexes: string[];
  maxPsbtBytes: number;
  changeAddresses?: string[];
  source?: "demo" | "user-reviewed";
  revision?: number;
}
export interface PrevoutEvidence {
  previousTransactions: Uint8Array[];
}
export interface ReviewSnapshot {
  intent: ConfirmedIntent;
  profile: WalletProfile;
  psbtBytes: Uint8Array;
  evidence: PrevoutEvidence;
  sessionId: number;
  revision: number;
}
export interface ReviewBinding {
  schemaVersion: 1;
  engineVersion: string;
  psbtHash: string;
  evidenceHash: string;
  intentHash: string;
  profileHash: string;
}
export interface ReviewReceipt {
  binding: ReviewBinding;
  report: VerificationReport;
  sessionId: number;
  revision: number;
}
export interface ReviewResult {
  facts: TransactionFacts;
  receipt: ReviewReceipt;
}
