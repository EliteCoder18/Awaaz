import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Volume2,
  Square,
  Fingerprint,
  Check,
  Lock,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Locale, LocalizedReport, ReviewResult } from "../core/types";
import type { FinalVerdict } from "../core/finalVerdict";
import { PictureReceipt } from "./PictureReceipt";

export function TransactionReview({
  result,
  localized,
  locale,
  onRead,
  onStop,
  simple = false,
  quiet = false,
  finalVerdict,
  aiPanel,
}: {
  finalVerdict?: FinalVerdict;
  aiPanel?: ReactNode;
  result?: ReviewResult;
  localized?: LocalizedReport;
  locale: Locale;
  onRead: () => void;
  onStop: () => void;
  simple?: boolean;
  quiet?: boolean;
}) {
  const hi = locale === "hi-IN",
    t = (en: string, hin: string) => (hi ? hin : en);
  const report = result?.receipt.report,
    verdict = report?.verdict;
  const final =
    finalVerdict ??
    (verdict === "MATCH"
      ? "GO"
      : verdict === "MISMATCH"
        ? "DO_NOT_SIGN"
        : verdict
          ? "CANT_TELL"
          : undefined);
  const Icon =
    final === "GO"
      ? ShieldCheck
      : final === "DO_NOT_SIGN" || final === "PAUSE"
        ? ShieldAlert
        : ShieldQuestion;
  const panelClass = final
    ? {
        GO: "match",
        PAUSE: "pause",
        DO_NOT_SIGN: "mismatch",
        CANT_TELL: "incomplete",
      }[final]
    : "empty";
  const p = report?.speakableParameters;
  const amount = (key: string) =>
    p?.[key] && /^\d+$/.test(p[key])
      ? BigInt(p[key]).toLocaleString("en-IN")
      : "—";
  return (
    <section
      id="review"
      className={"review-panel " + panelClass}
      aria-labelledby="review-heading"
      tabIndex={-1}
    >
      <div className="review-topline">
        <span className="eyebrow">
          {t("03 / THE SECOND LOOK", "०३ / दोबारा जाँच")}
        </span>
        <span className="tiny-pill">
          {t("Independent review", "स्वतंत्र जाँच")}
        </span>
      </div>
      <div className="verdict-emblem">
        <Icon size={35} strokeWidth={1.45} aria-hidden="true" />
      </div>
      <h2 id="review-heading" tabIndex={-1}>
        {localized?.title ??
          t(
            "A little clarity.\nBefore you sign.",
            "साइन करने से पहले,\nथोड़ी स्पष्टता।",
          )}
      </h2>
      <p className="review-description">
        {localized?.instruction ??
          t(
            "Your wallet prepares the payment. Awaaz takes a second look at what it actually says.",
            "वॉलेट भुगतान तैयार करता है। आवाज़ उसके वास्तविक विवरण को दोबारा जाँचता है।",
          )}
      </p>
      {localized?.explanation && (
        <p className="ai-explanation">
          {localized.explanation}
          <span className="lock-badge">
            <Lock size={13} aria-hidden="true" />
            {t("Numbers verified", "आँकड़े जाँचे गए")}
          </span>
        </p>
      )}
      {localized?.lock === "blocked" && (
        <p className="lock-note">
          <Lock size={13} aria-hidden="true" />
          {t(
            "The AI's explanation didn't match the verified numbers, so Awaaz is showing the checked summary instead.",
            "AI का विवरण जाँचे गए आँकड़ों से मेल नहीं खाया, इसलिए आवाज़ जाँचा हुआ सार दिखा रहा है।",
          )}
        </p>
      )}
      {localized ? (
        <motion.div
          key={result?.receipt.revision}
          initial={false}
          animate={{ opacity: 1 }}
        >
          {simple && report && (
            <PictureReceipt report={report} locale={locale} final={final} />
          )}
          {aiPanel}
          <div hidden={simple} className="review-metrics">
            <div>
              <span>{t("Payment", "भुगतान")}</span>
              <strong>
                {amount("actualAmount")} <small>sats</small>
              </strong>
            </div>
            <div>
              <span>{t("Network fee", "नेटवर्क शुल्क")}</span>
              <strong>
                {amount("fee")} <small>sats</small>
              </strong>
            </div>
            <div className="metric-total">
              <span>{t("Total external debit", "कुल बाहरी भुगतान")}</span>
              <strong>
                {amount("debit")} <small>sats</small>
              </strong>
            </div>
            <div>
              <span>{t("Configured change", "कॉन्फ़िगर किया चेंज")}</span>
              <strong>
                {amount("change")} <small>sats</small>
              </strong>
            </div>
          </div>
          {localized.details.length > 0 && (
            <ul className="issue-list">
              {localized.details.map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
          <div className="button-row">
            <button
              className="button small"
              disabled={quiet}
              onClick={onRead}
              type="button"
            >
              <Volume2 size={16} aria-hidden="true" />
              {t("Hear this review", "जाँच सुनें")}
            </button>
            <button
              className="button ghost small"
              onClick={onStop}
              type="button"
            >
              <Square size={13} aria-hidden="true" />
              {t("Stop audio", "आवाज़ रोकें")}
            </button>
          </div>
          <details className="transaction-ledger">
            <summary>{t("Every input & output", "हर इनपुट और आउटपुट")}</summary>
            <div className="ledger-body">
              <p>
                {t(
                  "Fixed testnet context; chain origin is not encoded in the PSBT.",
                  "टेस्टनेट संदर्भ तय है; PSBT से नेटवर्क का मूल पता नहीं चलता।",
                )}
              </p>
              <p>
                {t("Version", "संस्करण")} {result?.facts.version ?? "—"} ·{" "}
                {t("Locktime", "लॉकटाइम")} {result?.facts.locktime ?? "—"} ·{" "}
                {t("Replaceable", "प्रतिस्थापन योग्य")}:{" "}
                {result?.facts.replaceable ? t("Yes", "हाँ") : t("No", "नहीं")}
              </p>
              {result?.facts.inputs?.map((input) => (
                <div key={input.index} className="ledger-line">
                  <strong>
                    {t("Input", "इनपुट")} {input.index + 1} ·{" "}
                    {input.valueSats?.toLocaleString("en-IN") ?? "—"} sats
                  </strong>
                  <code>{input.outpoint}</code>
                  <span>
                    {input.evidenceStatus === "validated"
                      ? t(
                          "Hash-linked previous transaction",
                          "हैश से जुड़ा पिछला लेन-देन",
                        )
                      : t(
                          "Evidence missing / value claimed",
                          "प्रमाण अधूरा / राशि का दावा",
                        )}
                  </span>
                </div>
              ))}
              {result?.facts.outputs.map((output) => (
                <div key={output.index} className="ledger-line">
                  <strong>
                    {t("Output", "आउटपुट")} {output.index + 1} ·{" "}
                    {output.valueSats.toLocaleString("en-IN")} sats
                  </strong>
                  <span>
                    {output.classification === "change"
                      ? t("Configured change", "कॉन्फ़िगर किया चेंज")
                      : output.classification === "recipient"
                        ? t(
                            "Known recipient (check authorization above)",
                            "ज्ञात प्राप्तकर्ता (ऊपर अनुमति जाँचें)",
                          )
                        : output.classification === "op_return"
                          ? "OP_RETURN"
                          : t(
                              "Unrecognized destination",
                              "अज्ञात प्राप्तकर्ता",
                            )}
                  </span>
                  <code>{output.displayAddress ?? output.scriptHex}</code>
                </div>
              ))}
            </div>
          </details>
          <details className="review-receipt">
            <summary>
              <Fingerprint size={16} aria-hidden="true" />
              {t("View review record", "जाँच रिकॉर्ड देखें")}
            </summary>
            <div className="ledger-body">
              <p>
                {t(
                  "This local record binds the exact transaction, instruction and profile. Any edit invalidates the review. It is not a signed safety certificate.",
                  "यह स्थानीय रिकॉर्ड लेन-देन, निर्देश और प्रोफ़ाइल से जुड़ा है। बदलाव से जाँच अमान्य होती है। यह साइन किया सुरक्षा प्रमाणपत्र नहीं है।",
                )}
              </p>
              {result &&
                Object.entries(result.receipt.binding).map(([key, value]) => (
                  <div className="hash-line" key={key}>
                    <span>{key}</span>
                    <code>{String(value)}</code>
                  </div>
                ))}
            </div>
          </details>
          <details className="full-readback">
            <summary>
              {t("Full spoken transcript", "पूरा बोला गया विवरण")}
            </summary>
            <p>{localized.speech}</p>
          </details>
        </motion.div>
      ) : (
        <div className="empty-checklist">
          {[
            t("The recipient you intended", "आपका चुना प्राप्तकर्ता"),
            t("The exact amount in sats", "सैट्स में सटीक राशि"),
            t("Change & every extra output", "चेंज और हर अतिरिक्त आउटपुट"),
            t("A fee within your limit", "आपकी सीमा में शुल्क"),
          ].map((item) => (
            <div key={item}>
              <Check size={15} aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
      <div className="review-boundary">
        <ShieldCheck size={15} aria-hidden="true" />
        <p>
          {t(
            "Awaaz never asks for your keys. Signing stays in your wallet.",
            "आवाज़ आपकी निजी कुंजी नहीं माँगता। साइन आपके वॉलेट में होता है।",
          )}
        </p>
      </div>
    </section>
  );
}
