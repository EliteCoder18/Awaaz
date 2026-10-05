import { findLookalike } from "./lookalike";
import type {
  ConfirmedIntent,
  PaymentIntent,
  TransactionFacts,
  VerificationIssue,
  VerificationReport,
  WalletProfile,
} from "./types";
import { validMoney, validatePolicy } from "./verificationPolicy";

export function verifyPayment(
  draft: PaymentIntent,
  facts: TransactionFacts,
  profile: WalletProfile,
): VerificationReport {
  const intent = draft as Partial<ConfirmedIntent>;
  const issues: VerificationIssue[] = [];
  const add = (
    code: VerificationIssue["code"],
    severity: VerificationIssue["severity"],
    expected?: string,
    actual?: string,
  ) => issues.push({ code, severity, expected, actual });
  const report = (params: Record<string, string> = {}): VerificationReport => {
    const verdict = issues.some((i) => i.severity === "warning")
      ? "INCOMPLETE"
      : issues.length
        ? "MISMATCH"
        : "MATCH";
    return {
      verdict,
      issues,
      summaryKey: "verification." + verdict.toLowerCase(),
      speakableParameters: params,
      notices: facts.warnings
        .filter((w) => w.code === "OP_RETURN_PRESENT")
        .map((w) => w.code),
    };
  };
  if (facts.warnings.some((w) => w.code === "UNSUPPORTED_PSBT_VERSION")) {
    add("UNSUPPORTED_PSBT_VERSION", "warning");
    return report();
  }
  if (draft.ambiguities.length || draft.amountSats === undefined) {
    add("INTENT_AMBIGUOUS", "warning");
    return report();
  }
  if (
    intent.confirmed !== true ||
    !intent.recipientScriptHex ||
    !intent.policy
  ) {
    add("INTENT_UNCONFIRMED", "warning");
    return report();
  }
  issues.push(...validatePolicy(intent.policy));
  const expected = intent.recipientScriptHex.toLowerCase();
  const contact = profile.addressBook.find(
    (e) => e.id === intent.recipientAlias,
  );
  const change = new Set(
    profile.knownChangeScriptHexes.map((s) => s.toLowerCase()),
  );
  if (
    !contact?.scriptHexes.some((s) => s.toLowerCase() === expected) ||
    profile.addressBook.some((e) =>
      e.scriptHexes.some((s) => change.has(s.toLowerCase())),
    )
  ) {
    add("PROFILE_CONFLICT", "warning");
    return report();
  }
  for (const warning of facts.warnings)
    if (
      warning.code !== "OP_RETURN_PRESENT" &&
      warning.code !== "MISSING_INPUT_VALUE"
    )
      add(warning.code, "warning", undefined, warning.detail);
  if (
    facts.evidenceComplete !== true &&
    !issues.some((i) => i.code === "MISSING_PREVOUT_EVIDENCE")
  )
    add("MISSING_PREVOUT_EVIDENCE", "warning");
  let recipientTotal = 0n,
    changeTotal = 0n,
    externalTotal = 0n,
    outputTotal = 0n;
  const external = facts.outputs.filter(
    (o) => o.valueSats > 0n && !change.has(o.scriptHex.toLowerCase()),
  );
  const hasRecipient = external.some(
    (o) => o.scriptHex.toLowerCase() === expected,
  );
  for (const output of facts.outputs) {
    const script = output.scriptHex.toLowerCase();
    if (!validMoney(output.valueSats)) add("INVALID_FACTS", "danger");
    outputTotal += output.valueSats;
    if (change.has(script)) changeTotal += output.valueSats;
    else if (output.valueSats > 0n) {
      externalTotal += output.valueSats;
      if (script === expected) recipientTotal += output.valueSats;
      else if (hasRecipient || external.length > 1 || script.startsWith("6a"))
        add(
          "UNKNOWN_OUTPUT",
          "danger",
          undefined,
          output.valueSats + " sats · " + (output.displayAddress ?? script),
        );
    } else if (
      !script.startsWith("6a") &&
      script !== expected &&
      !change.has(script)
    )
      add("UNSUPPORTED_OUTPUT", "warning", undefined, script);
  }
  const trusted = [
    ...profile.addressBook.flatMap((e) =>
      e.address ? [{ name: e.displayName, address: e.address }] : [],
    ),
    ...(profile.changeAddresses ?? []).map((a) => ({
      name: "change",
      address: a,
    })),
  ];
  for (const output of external) {
    if (output.scriptHex.toLowerCase() === expected || !output.displayAddress)
      continue;
    const lookalike = findLookalike(output.displayAddress, trusted);
    if (lookalike)
      add(
        "LOOKALIKE_ADDRESS",
        "danger",
        lookalike.name + " · " + lookalike.address,
        output.displayAddress,
      );
  }
  if (!hasRecipient)
    add(
      "RECIPIENT_MISMATCH",
      "danger",
      contact.displayName,
      external[0]?.displayAddress ?? external[0]?.scriptHex ?? "missing",
    );
  const comparedAmount = hasRecipient ? recipientTotal : externalTotal;
  if (comparedAmount !== draft.amountSats)
    add(
      "AMOUNT_MISMATCH",
      "danger",
      draft.amountSats.toString(),
      comparedAmount.toString(),
    );
  if (
    !validMoney(draft.amountSats) ||
    draft.amountSats === 0n ||
    !validMoney(outputTotal) ||
    outputTotal !== facts.outputTotalSats
  )
    add("INVALID_FACTS", "danger");
  if (facts.feeSats === undefined || facts.inputTotalSats === undefined)
    add("FEE_UNAVAILABLE", "warning");
  else {
    if (
      !validMoney(facts.feeSats) ||
      !validMoney(facts.inputTotalSats) ||
      facts.inputTotalSats - outputTotal !== facts.feeSats
    )
      add("INVALID_FEE", "danger");
    if (facts.feeSats > intent.policy.maxFeeSats)
      add(
        "FEE_CAP_EXCEEDED",
        "danger",
        intent.policy.maxFeeSats.toString(),
        facts.feeSats.toString(),
      );
  }
  return report({
    recipient: contact.displayName,
    recipientAddress: contact.address ?? expected,
    expectedAmount: draft.amountSats.toString(),
    actualAmount: comparedAmount.toString(),
    recipientAmount: recipientTotal.toString(),
    externalAmount: externalTotal.toString(),
    fee: facts.feeSats?.toString() ?? "unknown",
    maxFee: intent.policy.maxFeeSats.toString(),
    change: changeTotal.toString(),
    debit:
      facts.feeSats === undefined
        ? "unknown"
        : (externalTotal + facts.feeSats).toString(),
    outputs: String(facts.outputs.length),
    locktime: String(facts.locktime ?? 0),
    replaceable: String(facts.replaceable ?? false),
  });
}
