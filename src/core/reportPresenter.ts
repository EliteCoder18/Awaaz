import type {
  LocalizedReport,
  Locale,
  VerificationIssue,
  VerificationReport,
} from "./types";
import { assessPaymentContext } from "./paymentContext";
const sats = (value: string | undefined, locale: Locale) =>
  value && /^\d+$/.test(value)
    ? new Intl.NumberFormat(locale).format(BigInt(value))
    : locale === "hi-IN"
      ? "अज्ञात"
      : "unknown";
function issueDetail(i: VerificationIssue, locale: Locale): string {
  const hi = locale === "hi-IN";
  switch (i.code) {
    case "RECIPIENT_MISMATCH":
      return hi
        ? "प्राप्तकर्ता मेल नहीं खाता: अपेक्षित " +
            i.expected +
            ", वास्तविक " +
            i.actual +
            "।"
        : "Recipient mismatch: expected " +
            i.expected +
            ", actual " +
            i.actual +
            ".";
    case "AMOUNT_MISMATCH":
      return hi
        ? "राशि मेल नहीं खाती: अपेक्षित " +
            sats(i.expected, locale) +
            " सैट्स, वास्तविक " +
            sats(i.actual, locale) +
            " सैट्स।"
        : "Amount mismatch: expected " +
            sats(i.expected, locale) +
            " sats, actual " +
            sats(i.actual, locale) +
            " sats.";
    case "UNKNOWN_OUTPUT":
      return hi
        ? "एक अतिरिक्त, अनधिकृत भुगतान मिला: " + i.actual + "।"
        : "An additional unapproved payment was found: " + i.actual + ".";
    case "LOOKALIKE_ADDRESS":
      return hi
        ? "धोखे का पता: " +
            i.actual +
            " दिखने में " +
            i.expected +
            " जैसा है, पर यह अलग पता है।"
        : "Lookalike address: " +
            i.actual +
            " looks like " +
            i.expected +
            " but is a different address. This is a common scam.";
    case "FEE_CAP_EXCEEDED":
      return hi
        ? "शुल्क आपकी सीमा से अधिक है: सीमा " +
            sats(i.expected, locale) +
            " सैट्स, वास्तविक " +
            sats(i.actual, locale) +
            " सैट्स।"
        : "Fee exceeds your limit: maximum " +
            sats(i.expected, locale) +
            " sats, actual " +
            sats(i.actual, locale) +
            " sats.";
    default: {
      const messages: Record<string, [string, string]> = {
        FEE_UNAVAILABLE: [
          "The network fee could not be verified.",
          "नेटवर्क शुल्क सत्यापित नहीं किया जा सका।",
        ],
        INTENT_AMBIGUOUS: [
          "Part of your payment instruction is unclear.",
          "आपके भुगतान निर्देश का कुछ हिस्सा स्पष्ट नहीं है।",
        ],
        INTENT_UNCONFIRMED: [
          "Confirm your recipient, amount and maximum fee first.",
          "पहले प्राप्तकर्ता, राशि और अधिकतम शुल्क की पुष्टि करें।",
        ],
        INVALID_FEE: [
          "Input and output totals produce an invalid fee.",
          "इनपुट और आउटपुट से निकला शुल्क अमान्य है।",
        ],
        INVALID_FACTS: [
          "The transaction amount totals are inconsistent.",
          "लेन-देन की कुल राशियाँ मेल नहीं खातीं।",
        ],
        PROFILE_CONFLICT: [
          "Recipient and change configuration conflicts with your intent.",
          "प्राप्तकर्ता या चेंज का पता आपके निर्देश से मेल नहीं खाता।",
        ],
        MISSING_PREVOUT_EVIDENCE: [
          "Previous transaction evidence is missing. Input values are only claimed.",
          "पिछले लेन-देन का प्रमाण नहीं मिला। इनपुट की राशि अभी केवल दावा है।",
        ],
        UNSUPPORTED_PSBT_VERSION: [
          "Only unsigned PSBT version 0 is supported.",
          "केवल बिना साइन किया PSBT संस्करण 0 समर्थित है।",
        ],
        UNSUPPORTED_INPUT: [
          "This input type needs additional verification.",
          "इस इनपुट प्रकार के लिए अतिरिक्त सत्यापन चाहिए।",
        ],
        UNSUPPORTED_SIGHASH: [
          "The requested signature mode is not supported.",
          "माँगा गया सिग्नेचर मोड समर्थित नहीं है।",
        ],
        UNSUPPORTED_TIMELOCK: [
          "Relative timelocks need additional verification.",
          "सापेक्ष टाइमलॉक के लिए अतिरिक्त सत्यापन चाहिए।",
        ],
        UNSUPPORTED_OUTPUT: [
          "An output script could not be understood.",
          "एक आउटपुट स्क्रिप्ट समझी नहीं जा सकी।",
        ],
        PARSE_FAILED: [
          "Transaction data could not be verified. " + (i.actual ?? ""),
          "लेन-देन का डेटा सत्यापित नहीं हुआ। " + (i.actual ?? ""),
        ],
      };
      return (
        messages[i.code]?.[hi ? 1 : 0] ??
        (hi ? "सत्यापन अधूरा है।" : "Verification is incomplete.")
      );
    }
  }
}
export function presentReport(
  report: VerificationReport,
  locale: Locale,
): LocalizedReport {
  const hi = locale === "hi-IN",
    p = report.speakableParameters;
  const copy = {
    MATCH: {
      title: hi ? "लेन-देन मेल खाता है" : "Transaction matches",
      instruction: hi
        ? "यह आपके पुष्टि किए निर्देश से मेल खाता है। साइन करने से पहले वॉलेट में भी विवरण जाँचें।"
        : "Matches your confirmed instruction. Review these details in your wallet before signing.",
    },
    MISMATCH: {
      title: hi ? "लेन-देन मेल नहीं खाता" : "Transaction does not match",
      instruction: hi
        ? "साइन न करें। वॉलेट में जाकर लेन-देन ठीक करें।"
        : "Do not sign. Return to your wallet and correct the transaction.",
    },
    INCOMPLETE: {
      title: hi ? "सत्यापन अधूरा है" : "Verification is incomplete",
      instruction: hi
        ? "साइन न करें। पहले सभी आवश्यक विवरण सत्यापित करें।"
        : "Do not sign. Resolve every missing detail before reviewing again.",
    },
  }[report.verdict];
  const readback: string[] = p.recipient
    ? [
        hi
          ? "इच्छित प्राप्तकर्ता: " + p.recipient + "।"
          : "Intended recipient: " + p.recipient + ".",
        ...(p.recipientAddress
          ? [
              hi
                ? "पुष्टि किया पता: " + p.recipientAddress + "।"
                : "Confirmed address: " + p.recipientAddress + ".",
            ]
          : []),
        hi
          ? "भुगतान राशि: " + sats(p.actualAmount, locale) + " सैट्स।"
          : "Payment amount: " + sats(p.actualAmount, locale) + " sats.",
        hi
          ? "नेटवर्क शुल्क: " + sats(p.fee, locale) + " सैट्स।"
          : "Network fee: " + sats(p.fee, locale) + " sats.",
        hi
          ? "कुल बाहरी भुगतान: " + sats(p.debit, locale) + " सैट्स।"
          : "Total external debit: " + sats(p.debit, locale) + " sats.",
        hi
          ? "कॉन्फ़िगर किए पते पर चेंज: " + sats(p.change, locale) + " सैट्स।"
          : "Change to configured addresses: " +
            sats(p.change, locale) +
            " sats.",
      ]
    : [];
  if (p.locktime && p.locktime !== "0")
    readback.push(
      hi
        ? "लॉकटाइम: " + p.locktime + "।"
        : "Transaction locktime: " + p.locktime + ".",
    );
  if (p.replaceable === "true")
    readback.push(
      hi
        ? "यह लेन-देन शुल्क बदलने के लिए प्रतिस्थापित हो सकता है।"
        : "This transaction signals replace-by-fee.",
    );
  const details = report.issues.map((i) => issueDetail(i, locale));
  if (report.context) {
    if (report.context.purpose.trim())
      readback.push(
        hi
          ? "आपने भुगतान का कारण बताया: " + report.context.purpose
          : "Your stated payment purpose: " + report.context.purpose,
      );
    details.push(
      ...assessPaymentContext(report.context, locale).map((n) => n.text),
    );
    details.push(
      hi
        ? "ये संदर्भ संकेत हैं, धोखाधड़ी का निर्णय या सुरक्षा प्रमाण नहीं।"
        : "These are contextual prompts, not a fraud verdict or proof of safety.",
    );
  }
  if (report.notices?.includes("OP_RETURN_PRESENT"))
    details.push(
      hi
        ? "शून्य राशि का OP_RETURN डेटा मौजूद है।"
        : "Informational: zero-value OP_RETURN data is present.",
    );
  readback.push(
    hi
      ? "यह केवल आपके निर्देश से मेल की जाँच है। यह स्वामित्व, ब्लॉकचेन में शामिल होने या इनपुट के अभी खर्च न होने का प्रमाण नहीं है। जाँच रिकॉर्ड स्थानीय है, साइन किया सुरक्षा प्रमाणपत्र नहीं।"
      : "This checks consistency only. It does not prove ownership, chain inclusion or that inputs remain unspent. The local review record is not a signed safety certificate.",
  );
  return {
    ...copy,
    details,
    readback,
    speech: [copy.title, copy.instruction, ...details, ...readback].join(" "),
  };
}
