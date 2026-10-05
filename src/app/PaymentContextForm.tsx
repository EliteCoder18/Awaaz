import { assessPaymentContext } from "../core/paymentContext";
import type { Locale, PaymentContext } from "../core/types";
export function PaymentContextForm({
  value,
  locale,
  onChange,
}: {
  value: PaymentContext;
  locale: Locale;
  onChange: (context: PaymentContext) => void;
}) {
  const t = (en: string, hi: string) => (locale === "hi-IN" ? hi : en);
  const notices = assessPaymentContext(value, locale);
  return (
    <div className="payment-context">
      <div className="context-caption">
        <span className="eyebrow">
          {t("BEYOND THE NUMBERS", "राशि से आगे")}
        </span>
        <span>
          {t(
            "Optional · your context, not a verdict",
            "वैकल्पिक · संदर्भ, निर्णय नहीं",
          )}
        </span>
      </div>
      <label htmlFor="payment-purpose">
        {t("What is this payment for?", "यह भुगतान किसलिए है?")}
      </label>
      <textarea
        id="payment-purpose"
        rows={2}
        value={value.purpose}
        maxLength={500}
        placeholder={t(
          "For example: a friend called urgently asking for help.",
          "जैसे: किसी दोस्त ने जल्दी मदद के लिए फ़ोन किया।",
        )}
        onChange={(e) => onChange({ ...value, purpose: e.target.value })}
      />
      <label htmlFor="relationship">
        {t("Recipient familiarity", "प्राप्तकर्ता से परिचय")}
      </label>
      <select
        id="relationship"
        value={value.relationship}
        onChange={(e) =>
          onChange({
            ...value,
            relationship: e.target.value as PaymentContext["relationship"],
          })
        }
      >
        <option value="unsure">{t("I’m not sure", "निश्चित नहीं")}</option>
        <option value="known">
          {t("Someone I already know", "पहले से परिचित व्यक्ति")}
        </option>
        <option value="new">{t("A new recipient", "नया प्राप्तकर्ता")}</option>
      </select>
      <label className="check-label">
        <input
          type="checkbox"
          checked={value.independentlyVerified}
          onChange={(e) =>
            onChange({ ...value, independentlyVerified: e.target.checked })
          }
        />
        {t(
          "I checked this person through a separate trusted channel.",
          "मैंने अलग विश्वसनीय माध्यम से व्यक्ति की पहचान जाँची है।",
        )}
      </label>
      {notices.length > 0 && (
        <ul
          className="context-notices"
          aria-label={t("Context considerations", "संदर्भ के संकेत")}
        >
          {notices.map((n) => (
            <li key={n.code}>{n.text}</li>
          ))}
        </ul>
      )}
      <p className="context-boundary">
        {t(
          "These are rule-based pause prompts, not AI fraud detection. They never turn a matching transaction into proven safety.",
          "ये नियम-आधारित रुककर सोचने के संकेत हैं, AI धोखाधड़ी पहचान नहीं। मेल खाता लेन-देन सुरक्षा सिद्ध नहीं करता।",
        )}
      </p>
    </div>
  );
}
