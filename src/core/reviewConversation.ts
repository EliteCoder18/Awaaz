import type { Locale, PaymentContext, ReviewResult } from "./types";
import { assessPaymentContext } from "./paymentContext";
import { presentReport } from "./reportPresenter";
import type { QuestionCategory } from "./questionCategories";
export function answerReviewCategory(
  category: QuestionCategory,
  result: ReviewResult | undefined,
  context: PaymentContext,
  locale: Locale,
): ReviewAnswer {
  const canonical: Record<QuestionCategory, string> = {
    recipient: "Who receives this payment?",
    amount: "What is the amount?",
    fee: "What is the network fee?",
    debit: "What leaves my wallet?",
    change: "Where is the change?",
    unusual: "What is unusual?",
    limits: "What can't you verify?",
    unsupported: "unsupported question",
  };
  return answerReviewQuestion(canonical[category], result, context, locale);
}
export interface ReviewAnswer {
  kind:
    | "recipient"
    | "amount"
    | "fee"
    | "debit"
    | "change"
    | "unusual"
    | "limits"
    | "unsupported"
    | "unavailable";
  text: string;
}
export function answerReviewQuestion(
  question: string,
  result: ReviewResult | undefined,
  context: PaymentContext,
  locale: Locale,
): ReviewAnswer {
  const hi = locale === "hi-IN",
    q = question.trim().toLowerCase(),
    t = (en: string, hin: string) => (hi ? hin : en);
  if (!result)
    return {
      kind: "unavailable",
      text: t(
        "Verify a current transaction before asking about its facts.",
        "लेन-देन के बारे में पूछने से पहले उसकी वर्तमान जाँच करें।",
      ),
    };
  const p = result.receipt.report.speakableParameters,
    fmt = (key: string) =>
      p[key] && /^\d+$/.test(p[key])
        ? BigInt(p[key]).toLocaleString("en-IN")
        : t("unknown", "अज्ञात");
  if (
    /\bsafe(?:ty)?\b|सुरक्षित|सुरक्षा|ownership|identity|पहचान|prove|can.?t.*verify|cannot.*verify|नहीं.*सत्यापित|क्या.*सत्यापित.*नहीं/i.test(
      q,
    )
  )
    return {
      kind: "limits",
      text: t(
        "Awaaz cannot prove safety, identity, ownership or that inputs are unspent. MATCH only means the transaction matches your confirmed instruction. Independently check the recipient and review your wallet before signing.",
        "आवाज़ सुरक्षा, पहचान, स्वामित्व या इनपुट के अभी खर्च न होने का प्रमाण नहीं दे सकता। MATCH केवल पुष्टि किए निर्देश से मेल है। प्राप्तकर्ता की पहचान स्वतंत्र रूप से जाँचें और साइन से पहले वॉलेट देखें।",
      ),
    };
  if (/unusual|wrong|risk|warning|असामान्य|गलत|जोखिम|चेतावनी/i.test(q)) {
    const localized = presentReport(result.receipt.report, locale),
      notices = assessPaymentContext(context, locale);
    return {
      kind: "unusual",
      text: [
        localized.title,
        ...localized.details,
        ...notices.map((n) => n.text),
        t(
          "Context hints are not fraud detection or identity proof.",
          "संदर्भ के संकेत धोखाधड़ी का पता लगाने या पहचान का प्रमाण नहीं हैं।",
        ),
      ].join(" "),
    };
  }
  if (/\bchange\b|चेंज|वापस/i.test(q))
    return {
      kind: "change",
      text: t(
        `Change: ${fmt("change")} sats to your independently configured change scripts. This does not prove address ownership.`,
        `चेंज: ${fmt("change")} सैट्स आपके स्वतंत्र रूप से कॉन्फ़िगर किए चेंज पतों पर। यह स्वामित्व सिद्ध नहीं करता।`,
      ),
    };
  if (/\b(?:leave|leaves|debit|total|spend|spent)\b|कुल|बाहर|कटेंगे/i.test(q))
    return {
      kind: "debit",
      text: t(
        `Total external debit: ${fmt("debit")} sats, including the network fee. Configured change stays separate.`,
        `कुल बाहरी भुगतान: ${fmt("debit")} सैट्स, नेटवर्क शुल्क सहित। कॉन्फ़िगर किया चेंज अलग है।`,
      ),
    };
  if (/\b(?:fee|fees|cost)\b|शुल्क|फीस/i.test(q))
    return {
      kind: "fee",
      text: t(
        `Network fee: ${fmt("fee")} sats. Your confirmed maximum is ${fmt("maxFee")} sats. Live sat/vB estimates are separate context, not an exact unsigned fee-rate calculation.`,
        `नेटवर्क शुल्क: ${fmt("fee")} सैट्स। आपकी पुष्टि की सीमा ${fmt("maxFee")} सैट्स है। लाइव sat/vB अनुमान अलग संदर्भ है, बिना साइन लेन-देन की सटीक दर नहीं।`,
      ),
    };
  if (/recipient|receiv|\bwho\b|किसे|प्राप्तकर्ता/i.test(q)) {
    const outputs = result.facts.outputs.filter(
      (o) => o.valueSats > 0n && o.classification !== "change",
    );
    return {
      kind: "recipient",
      text: t(
        `Intended recipient: ${p.recipient ?? "unknown"}. Actual non-change destinations: ${outputs.map((o) => o.displayAddress ?? o.scriptHex).join("; ") || "unknown"}. A QR label or contact name is not proof of identity.`,
        `इच्छित प्राप्तकर्ता: ${p.recipient ?? "अज्ञात"}। वास्तविक बाहरी पते: ${outputs.map((o) => o.displayAddress ?? o.scriptHex).join("; ") || "अज्ञात"}। QR का नाम पहचान का प्रमाण नहीं है।`,
      ),
    };
  }
  if (/\b(?:amount|payment|send|sending)\b|राशि|भुगतान|भेज/i.test(q))
    return {
      kind: "amount",
      text:
        t(
          `All external payments: ${fmt("externalAmount")} sats, excluding the network fee. Intended-recipient subtotal: ${fmt("recipientAmount")} sats. Your confirmed amount: ${fmt("expectedAmount")} sats.`,
          `सभी बाहरी भुगतान: ${fmt("externalAmount")} सैट्स, नेटवर्क शुल्क के बिना। इच्छित प्राप्तकर्ता का उप-कुल: ${fmt("recipientAmount")} सैट्स। आपकी पुष्टि की राशि: ${fmt("expectedAmount")} सैट्स।`,
        ) +
        " " +
        presentReport(result.receipt.report, locale).instruction,
    };
  return {
    kind: "unsupported",
    text: t(
      "I can explain the recipient, amount, fee, total debit, change, unusual details and verification limits. Rephrase or use a suggested question. I do not predict prices or infer facts outside this review.",
      "मैं प्राप्तकर्ता, राशि, शुल्क, कुल भुगतान, चेंज, असामान्य विवरण और जाँच की सीमाएँ समझा सकता हूँ। सुझाए प्रश्न चुनें। मैं कीमत या जाँच से बाहर के तथ्य नहीं बताता।",
    ),
  };
}
