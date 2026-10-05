import type {
  AddressBookEntry,
  IntentAmbiguity,
  PaymentIntent,
  SpeechResult,
} from "./types";
import { validMoney } from "./verificationPolicy";

const small: Record<string, bigint> = {};
"zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen"
  .split(" ")
  .forEach((s, i) => (small[s] = BigInt(i)));
"twenty thirty forty fifty sixty seventy eighty ninety"
  .split(" ")
  .forEach((s, i) => (small[s] = BigInt((i + 2) * 10)));
const hindi: [number, string][] = [
  [0, "शून्य shunya"],
  [1, "एक ek"],
  [2, "दो do"],
  [3, "तीन teen"],
  [4, "चार chaar char"],
  [5, "पाँच पांच paanch panch"],
  [6, "छह chhe"],
  [7, "सात saat"],
  [8, "आठ aath"],
  [9, "नौ nau"],
  [10, "दस das"],
  [11, "ग्यारह gyarah"],
  [12, "बारह barah"],
  [13, "तेरह terah"],
  [14, "चौदह chaudah"],
  [15, "पंद्रह pandrah"],
  [16, "सोलह solah"],
  [17, "सत्रह satrah"],
  [18, "अठारह atharah"],
  [19, "उन्नीस unnees"],
  [20, "बीस bees"],
  [25, "पच्चीस pachchees pachis"],
  [30, "तीस tees"],
  [40, "चालीस chaalis chalis"],
  [50, "पचास pachaas pachas"],
  [60, "साठ saath"],
  [70, "सत्तर sattar"],
  [80, "अस्सी assi"],
  [90, "नब्बे nabbe"],
];
hindi.forEach(([n, words]) =>
  words.split(" ").forEach((w) => (small[w] = BigInt(n))),
);
const scales: Record<string, bigint> = {
  hundred: 100n,
  सौ: 100n,
  sau: 100n,
  thousand: 1000n,
  हजार: 1000n,
  हज़ार: 1000n,
  hazaar: 1000n,
  hazar: 1000n,
  lakh: 100000n,
  लाख: 100000n,
  crore: 10000000n,
  करोड़: 10000000n,
  million: 1000000n,
};
// Used by the Number Lock to refuse amounts written in words.
export function isNumberWord(word: string): boolean {
  return small[word] !== undefined || scales[word] !== undefined;
}
export const NUMBER_SCALE_WORDS = [
  ...Object.keys(scales),
  "half",
  "आधा",
  "aadha",
];
const satsUnits = new Set([
  "sat",
  "sats",
  "satoshi",
  "satoshis",
  "सैट",
  "सैट्स",
  "सतोशी",
  "सातोशी",
]);
const btcUnits = new Set(["btc", "bitcoin", "बिटकॉइन"]);
const filler = new Set(
  "send pay transfer to please को भेजो भेजें भेजना भेज ko bhejo bheje bhejna mujhe मुझे मैं want i would like payment for देना and और".split(
    " ",
  ),
);
const isNumber = (t: string) =>
  /^[+-]?\d/.test(t) || t in small || t in scales || t === "and" || t === "और";
function numeric(t: string, btc: boolean): bigint | undefined {
  if (
    !/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d+)?$/.test(t)
  )
    return;
  const [whole, fractional = ""] = t.replaceAll(",", "").split(".");
  if ((!btc && fractional) || fractional.length > 8) return;
  return (
    BigInt(whole) * (btc ? 100_000_000n : 1n) +
    (btc ? BigInt(fractional.padEnd(8, "0")) : 0n)
  );
}
function wordsAmount(tokens: string[]): bigint | undefined {
  let total = 0n,
    group = 0n,
    lastSmall = -1n,
    lastScale = 1_000_000_000n,
    hundred = false;
  for (const t of tokens) {
    if (t === "and" || t === "और") continue;
    if (t in scales) {
      const scale = scales[t];
      if (scale === 100n) {
        if (hundred || group <= 0n || group > 9n) return;
        group *= 100n;
        hundred = true;
        lastSmall = -1n;
      } else {
        if (scale >= lastScale || group <= 0n) return;
        total += group * scale;
        group = 0n;
        lastScale = scale;
        lastSmall = -1n;
        hundred = false;
      }
    } else if (t in small) {
      const n = small[t];
      if (
        lastSmall >= 0n &&
        !(lastSmall >= 20n && lastSmall % 10n === 0n && n > 0n && n < 10n)
      )
        return;
      group += n;
      lastSmall = n;
    } else return;
  }
  return total + group;
}
export function interpretIntent(
  speech: SpeechResult,
  addressBook: AddressBookEntry[],
): PaymentIntent {
  const digits = "०१२३४५६७८९";
  const normalized = [...speech.transcript.normalize("NFC").toLowerCase()]
    .map((c) => (digits.includes(c) ? String(digits.indexOf(c)) : c))
    .join("")
    .replace(/(?<=\p{L})-(?=\p{L})/gu, " ");
  const tokens = normalized.match(/[\p{L}\p{M}]+|[+-]?\d[\d,.]*/gu) ?? [];
  const ambiguities: IntentAmbiguity[] = [];
  const add = (code: IntentAmbiguity["code"], detail: string) =>
    ambiguities.push({ code, detail });
  if (/(?:^|[^\p{N}])[.,]\d/u.test(normalized))
    add(
      "UNSUPPORTED_AMOUNT",
      "Write a leading zero before a decimal amount, such as 0.0005 BTC.",
    );
  if (/[^\p{L}\p{M}\p{N}\s.,!?']/u.test(normalized))
    add(
      "UNSUPPORTED_LANGUAGE",
      "Remove unsupported currency, sign or punctuation and confirm an exact positive Bitcoin amount.",
    );
  const contactMatches = addressBook.filter((e) =>
    e.aliases.some((alias) => {
      const aliasTokens = alias.normalize("NFC").toLowerCase().split(/\s+/);
      return tokens.some((_, i) =>
        aliasTokens.every((t, j) => tokens[i + j] === t),
      );
    }),
  );
  const contact = contactMatches.length === 1 ? contactMatches[0] : undefined;
  if (!contact)
    add(
      contactMatches.length > 1 ? "AMBIGUOUS_RECIPIENT" : "MISSING_RECIPIENT",
      "Choose one configured recipient.",
    );
  if (
    /\b(?:not|no|don't|instead|cancel|minus|negative|nahi|nahin|mat)\b|नहीं|मत|नही/u.test(
      normalized,
    )
  )
    add(
      "NEGATED_INSTRUCTION",
      "Rewrite corrections or negative instructions as one clear payment.",
    );
  const unitIndexes = tokens.flatMap((t, i) =>
    satsUnits.has(t) || btcUnits.has(t) ? [i] : [],
  );
  let amountSats: bigint | undefined;
  if (!unitIndexes.length)
    add(
      tokens.some(isNumber) ? "MISSING_UNIT" : "MISSING_AMOUNT",
      "Specify an exact amount in sats or BTC.",
    );
  else if (unitIndexes.length > 1)
    add("MULTIPLE_AMOUNTS", "Use one amount and one authoritative unit.");
  else {
    const end = unitIndexes[0];
    let start = end;
    while (start > 0 && isNumber(tokens[start - 1])) start--;
    const phrase = tokens.slice(start, end);
    const btc = btcUnits.has(tokens[end]);
    amountSats =
      phrase.length === 1 && /^[+-]?\d/.test(phrase[0])
        ? numeric(phrase[0], btc)
        : btc
          ? undefined
          : wordsAmount(phrase);
    if (
      !phrase.length ||
      amountSats === undefined ||
      amountSats <= 0n ||
      !validMoney(amountSats)
    ) {
      amountSats = undefined;
      add(
        "UNSUPPORTED_AMOUNT",
        "Use a positive exact amount without rounding.",
      );
    }
    const aliasTokens = new Set(
      addressBook.flatMap((e) =>
        e.aliases.flatMap((a) => a.toLowerCase().split(/\s+/)),
      ),
    );
    const outside = tokens.filter((_, i) => i < start || i > end);
    if (
      outside.some(
        (t) =>
          /^[+-]?\d/.test(t) ||
          (isNumber(t) && !filler.has(t) && !aliasTokens.has(t)),
      )
    )
      add("MULTIPLE_AMOUNTS", "More than one amount was mentioned.");
    if (
      outside.some((t) => !filler.has(t) && !aliasTokens.has(t) && !isNumber(t))
    )
      add(
        "UNSUPPORTED_LANGUAGE",
        "Use a supported payment phrase or edit the transcript.",
      );
  }
  return {
    transcript: speech.transcript,
    locale: speech.locale,
    recipientAlias: contact?.id,
    expectedScriptHexes: contact?.scriptHexes ?? [],
    amountSats,
    ambiguities,
  };
}
