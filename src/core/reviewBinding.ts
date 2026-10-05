import type { ReviewBinding, ReviewSnapshot } from "./types";
import { toHex } from "./encoding";
export const ENGINE_VERSION = "awaaz-0.3.0";
async function hash(bytes: Uint8Array): Promise<string> {
  return toHex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes)),
    ),
  );
}
const textBytes = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
export async function createReviewBinding(
  s: ReviewSnapshot,
): Promise<ReviewBinding> {
  const [psbtHash, evidenceHashes] = await Promise.all([
    hash(s.psbtBytes),
    Promise.all(s.evidence.previousTransactions.map(hash)),
  ]);
  const i = s.intent,
    p = s.profile;
  const [evidenceHash, intentHash, profileHash] = await Promise.all([
    hash(textBytes(evidenceHashes.sort())),
    hash(
      textBytes([
        1,
        ENGINE_VERSION,
        i.transcript,
        i.locale,
        i.recipientAlias,
        i.recipientScriptHex,
        i.amountSats.toString(),
        i.policy.maxFeeSats.toString(),
        i.policy.revision,
        i.revision,
        i.confirmed,
        i.context
          ? [
              i.context.purpose,
              i.context.relationship,
              i.context.independentlyVerified,
            ]
          : null,
      ]),
    ),
    hash(
      textBytes([
        1,
        p.networkContext,
        p.source,
        p.revision,
        p.maxPsbtBytes,
        p.addressBook
          .map((e) => [
            e.id,
            e.displayName,
            [...e.aliases].sort(),
            [...e.scriptHexes].sort(),
            e.address,
          ])
          .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "en")),
        [...p.knownChangeScriptHexes].sort(),
        [...(p.changeAddresses ?? [])].sort(),
      ]),
    ),
  ]);
  return {
    schemaVersion: 1,
    engineVersion: ENGINE_VERSION,
    psbtHash,
    evidenceHash,
    intentHash,
    profileHash,
  };
}
export function isSameReview(a: ReviewBinding, b: ReviewBinding): boolean {
  return (
    a.schemaVersion === b.schemaVersion &&
    a.engineVersion === b.engineVersion &&
    a.psbtHash === b.psbtHash &&
    a.evidenceHash === b.evidenceHash &&
    a.intentHash === b.intentHash &&
    a.profileHash === b.profileHash
  );
}
