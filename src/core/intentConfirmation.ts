import type {
  ConfirmedIntent,
  PaymentIntent,
  VerificationPolicy,
} from "./types";
import { validatePolicy, validMoney } from "./verificationPolicy";
export function confirmIntent(
  draft: PaymentIntent,
  selectedScript: string,
  policy: VerificationPolicy,
  revision: number,
): ConfirmedIntent {
  if (
    draft.ambiguities.length ||
    !draft.recipientAlias ||
    draft.amountSats === undefined ||
    draft.amountSats <= 0n ||
    !validMoney(draft.amountSats) ||
    !draft.expectedScriptHexes.includes(selectedScript) ||
    validatePolicy(policy).length
  )
    throw new Error(
      "Resolve recipient, amount and maximum fee before confirming.",
    );
  return {
    ...draft,
    recipientAlias: draft.recipientAlias,
    recipientScriptHex: selectedScript,
    amountSats: draft.amountSats,
    policy: { ...policy },
    revision,
    confirmed: true,
  };
}
