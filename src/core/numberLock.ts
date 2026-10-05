// Number Lock: AI may phrase the explanation, but every number, address and
// verdict word it uses must agree with the facts the code verified. Anything
// else is rejected and the deterministic template is used instead.
import { isNumberWord, NUMBER_SCALE_WORDS } from "./intentInterpreter";
import type { FinalVerdict } from "./finalVerdict";
import type { ConfirmedIntent, ReviewResult, WalletProfile } from "./types";

export interface LockFacts {
  numbers: Set<string>;
  addresses: Set<string>;
}

export function lockFacts(
  result: ReviewResult,
  intent: ConfirmedIntent,
  profile: WalletProfile,
): LockFacts {
  const numbers = new Set<string>();
  const add = (value?: bigint | string | number) => {
    if (value === undefined) return;
    const text = String(value);
    if (/^\d+$/.test(text)) numbers.add(BigInt(text).toString());
  };
  for (const value of Object.values(result.receipt.report.speakableParameters))
    add(value);
  for (const output of result.facts.outputs) add(output.valueSats);
  add(result.facts.feeSats);
  add(result.facts.inputTotalSats);
  add(result.facts.outputTotalSats);
  add(result.facts.outputs.length);
  add(result.facts.inputs?.length);
  add(intent.amountSats);
  add(intent.policy.maxFeeSats);
  const addresses = new Set<string>();
  for (const output of result.facts.outputs)
    if (output.displayAddress) addresses.add(output.displayAddress.toLowerCase());
  for (const entry of profile.addressBook)
    if (entry.address) addresses.add(entry.address.toLowerCase());
  for (const change of profile.changeAddresses ?? [])
    addresses.add(change.toLowerCase());
  return { numbers, addresses };
}

const DEVANAGARI = "०१२३४५६७८९";
const UNIT = /^(?:sats?|satoshis?|btc|bitcoin|सैट्स?|सतोशी|बिटकॉइन)$/i;

function negated(text: string, index: number, end: number): boolean {
  const before = text.slice(Math.max(0, index - 14), index).toLowerCase();
  const after = text.slice(end, end + 14);
  return /\b(?:not|no|never|isn't|is not)\b/.test(before) || /नहीं|न /.test(after);
}

export function checkExplanation(
  text: string,
  facts: LockFacts,
  final: FinalVerdict,
): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const normalized = [...text.normalize("NFC")]
    .map((c) => (DEVANAGARI.includes(c) ? String(DEVANAGARI.indexOf(c)) : c))
    .join("");
  // 1. Digits: every number must be a verified amount or count.
  for (const match of normalized.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const raw = match[0].replace(/,+$/, "");
    const plain = raw.replace(/,/g, "");
    if (plain.includes(".") || !facts.numbers.has(BigInt(plain).toString()))
      problems.push("Unverified number: " + raw);
  }
  // 2. Amounts in words ("fifty thousand", "पचास हज़ार") are not allowed.
  const words = normalized.toLowerCase().match(/[\p{L}\p{M}]+/gu) ?? [];
  words.forEach((word, i) => {
    if (NUMBER_SCALE_WORDS.includes(word))
      problems.push("Amount written in words: " + word);
    else if (isNumberWord(word) && UNIT.test(words[i + 1] ?? ""))
      problems.push("Amount written in words: " + word + " " + words[i + 1]);
  });
  // 3. Addresses: only addresses present in the facts or address book.
  for (const match of normalized.matchAll(
    /\b(?:tb1|bc1|bcrt1)[a-z0-9]{6,}|\b[mn2][1-9A-HJ-NP-Za-km-z]{25,34}\b|\b[0-9a-f]{16,}\b/gi,
  ))
    if (!facts.addresses.has(match[0].toLowerCase()))
      problems.push("Unverified address: " + match[0]);
  // 4. Verdict words: never promise safety; never sound approving unless GO.
  for (const match of normalized.matchAll(
    /\b(?:safe|guarantee[ds]?)\b|सुरक्षित|गारंटी/giu,
  ))
    if (!negated(normalized, match.index, match.index + match[0].length))
      problems.push("Safety promise: " + match[0]);
  if (
    final !== "GO" &&
    /\b(?:go ahead|ok(?:ay)? to sign|you can sign|all good|looks fine)\b|सब सही|साइन कर सकते|आगे बढ़ सकते/iu.test(
      normalized,
    )
  )
    problems.push("Approving wording for a " + final + " verdict");
  return { ok: problems.length === 0, problems };
}
