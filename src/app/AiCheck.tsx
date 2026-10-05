import { Brain, Calculator, LoaderCircle } from "lucide-react";
import type { AiReviewResponse } from "../core/aiContract";
import { finalVerdictLabel, type FinalVerdict } from "../core/finalVerdict";
import type { Locale, VerificationReport } from "../core/types";

// Two judges, side by side: exact code facts and the AI's situation check.
export function AiCheck({
  locale,
  codeVerdict,
  finalVerdict,
  enabled,
  status,
  review,
  onToggle,
}: {
  locale: Locale;
  codeVerdict: VerificationReport["verdict"];
  finalVerdict: FinalVerdict;
  enabled: boolean;
  status?: "loading" | "done" | "error";
  review?: AiReviewResponse;
  onToggle: (enabled: boolean) => void;
}) {
  const hi = locale === "hi-IN",
    t = (en: string, hin: string) => (hi ? hin : en);
  const codeText = {
    MATCH: t("Facts match your instruction", "तथ्य आपके निर्देश से मेल खाते हैं"),
    MISMATCH: t("Facts do not match", "तथ्य मेल नहीं खाते"),
    INCOMPLETE: t("Some facts are missing", "कुछ तथ्य अधूरे हैं"),
  }[codeVerdict];
  const aiText = !enabled
    ? t("Off · code check only", "बंद · सिर्फ़ कोड जाँच")
    : status === "loading"
      ? t("Checking the situation…", "स्थिति जाँची जा रही है…")
      : status === "error" || !review
        ? t("Unavailable · code check only", "उपलब्ध नहीं · सिर्फ़ कोड जाँच")
        : {
            go: t("No warning signs", "कोई चेतावनी संकेत नहीं"),
            pause: t("Pause: check first", "रुकें: पहले जाँचें"),
            block: t("Scam warning signs", "धोखे के संकेत"),
          }[review.decision];
  return (
    <section
      className="ai-check"
      aria-label={t("Code check and AI check", "कोड जाँच और AI जाँच")}
    >
      <div className="ai-check-cards">
        <div className={"ai-card code-" + codeVerdict.toLowerCase()}>
          <Calculator size={20} aria-hidden="true" />
          <div>
            <span>{t("Code check · exact facts", "कोड जाँच · सटीक तथ्य")}</span>
            <strong>{codeText}</strong>
          </div>
        </div>
        <div
          className={
            "ai-card ai-" + (enabled && review ? review.decision : "off")
          }
          aria-busy={status === "loading"}
        >
          {status === "loading" && enabled ? (
            <LoaderCircle className="spin" size={20} aria-hidden="true" />
          ) : (
            <Brain size={20} aria-hidden="true" />
          )}
          <div>
            <span>{t("AI check · the situation", "AI जाँच · स्थिति")}</span>
            <strong>{aiText}</strong>
          </div>
        </div>
      </div>
      <p className="ai-final">
        {t("Final:", "अंतिम:")}{" "}
        <strong>{finalVerdictLabel(finalVerdict, locale)}</strong>
        <small>
          {t(
            " · AI can make this stricter, never looser.",
            " · AI इसे और सख़्त कर सकता है, ढीला कभी नहीं।",
          )}
        </small>
      </p>
      {enabled && review && review.followUps.length > 0 && (
        <div className="ai-followups">
          <strong>{t("Ask yourself", "खुद से पूछें")}</strong>
          <ul>
            {review.followUps.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
      <label className="ai-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        {t("AI help (OpenAI)", "AI मदद (OpenAI)")}
        <small>
          {t(
            "Sends your instruction, purpose and a transaction summary to OpenAI. No keys or signing.",
            "आपका निर्देश, उद्देश्य और लेन-देन का सार OpenAI को भेजा जाता है। कोई कुंजी या साइन नहीं।",
          )}
        </small>
      </label>
    </section>
  );
}
