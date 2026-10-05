import type { ContextNotice, Locale, PaymentContext } from "./types";
export function assessPaymentContext(
  context: PaymentContext,
  locale: Locale,
): ContextNotice[] {
  const hi = locale === "hi-IN",
    notices: ContextNotice[] = [];
  const negated =
    /\b(?:not urgent|no urgency|not an emergency)\b|जल्दी नहीं|आपातकाल नहीं|ज़रूरी नहीं/i.test(
      context.purpose,
    );
  if (
    !negated &&
    /\b(?:urgent(?:ly)?|emergency|immediately|hurry|jaldi|abhi)\b|तुरंत|तुरन्त|जल्दी|आपातकाल/i.test(
      context.purpose,
    )
  )
    notices.push({
      code: "URGENCY",
      text: hi
        ? "जल्दी का दबाव है। रुककर किसी पहले से ज्ञात माध्यम से प्राप्तकर्ता से बात करें।"
        : "An urgent request deserves a pause. Contact the person through a channel you already trust.",
    });
  if (context.relationship === "new")
    notices.push({
      code: "NEW_RECIPIENT",
      text: hi
        ? "नया प्राप्तकर्ता है। पहले पहचान और भुगतान के उद्देश्य को स्वतंत्र रूप से जाँचें।"
        : "This is a new recipient. Independently check their identity and the reason for payment.",
    });
  if (!context.independentlyVerified)
    notices.push({
      code: "IDENTITY_UNCHECKED",
      text: hi
        ? "आपने स्वतंत्र पहचान-जाँच की पुष्टि नहीं की है। मेल खाता पता किसी व्यक्ति की पहचान सिद्ध नहीं करता।"
        : "You have not confirmed an independent identity check. A matching address does not prove who owns it.",
    });
  return notices;
}
