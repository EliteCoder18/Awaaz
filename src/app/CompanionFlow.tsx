import type { ReactNode } from "react";
import {
  ArrowUp,
  FileUp,
  LayoutList,
  LoaderCircle,
  Mic,
  RefreshCcw,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Locale } from "../core/types";
import type { DemoScenario } from "../demo/fixtures";

// One-screen, intent-first conversation: say it → confirm → add the file →
// see the verdict. Reuses App's handlers and review components.
export function CompanionFlow({
  locale,
  quiet,
  transcript,
  listening,
  hasDraft,
  confirmed,
  psbtName,
  verifying,
  hasResult,
  error,
  feeText,
  intentReview,
  contextForm,
  missingProof,
  review,
  conversation,
  audioStatus,
  onTranscript,
  onSpeak,
  onStopSpeaking,
  onSubmit,
  onPreset,
  onFee,
  onFile,
  onDemo,
  onVerify,
  onReset,
  onDetailed,
  onQuiet,
  onLocale,
}: {
  locale: Locale;
  quiet: boolean;
  transcript: string;
  listening: boolean;
  hasDraft: boolean;
  confirmed: boolean;
  psbtName?: string;
  verifying: boolean;
  hasResult: boolean;
  error?: string;
  feeText: string;
  intentReview: ReactNode;
  contextForm: ReactNode;
  missingProof: ReactNode;
  review: ReactNode;
  conversation: ReactNode;
  audioStatus: string;
  onTranscript: (text: string) => void;
  onSpeak: () => void;
  onStopSpeaking: () => void;
  onSubmit: () => void;
  onPreset: () => void;
  onFee: (text: string) => void;
  onFile: (file: File | undefined) => void;
  onDemo: (scenario: DemoScenario) => void;
  onVerify: () => void;
  onReset: () => void;
  onDetailed: () => void;
  onQuiet: () => void;
  onLocale: (locale: Locale) => void;
}) {
  const hi = locale === "hi-IN",
    t = (en: string, hin: string) => (hi ? hin : en);
  const demos: [DemoScenario, string][] = [
    ["correct", t("Correct payment", "सही भुगतान")],
    ["tampered", t("Wrong recipient · 10×", "गलत प्राप्तकर्ता · १०×")],
    ["lookalike", t("Lookalike address", "मिलता-जुलता पता")],
    ["extra", t("An extra payment", "अतिरिक्त भुगतान")],
    ["high-fee", t("Fee above your limit", "सीमा से अधिक शुल्क")],
    ["missing-evidence", t("Missing proof", "अधूरा प्रमाण")],
  ];
  return (
    <section
      className="companion"
      aria-label={t("Payment conversation", "भुगतान बातचीत")}
    >
      <div className="companion-toolbar">
        <select
          aria-label={t("Review language", "जाँच की भाषा")}
          value={locale}
          onChange={(e) => onLocale(e.target.value as Locale)}
        >
          <option value="en-IN">English</option>
          <option value="hi-IN">हिन्दी</option>
        </select>
        <button className="text-button" type="button" onClick={onQuiet}>
          {quiet ? (
            <VolumeX size={16} aria-hidden="true" />
          ) : (
            <Volume2 size={16} aria-hidden="true" />
          )}
          {quiet ? t("Sound off", "आवाज़ बंद") : t("Sound on", "आवाज़ चालू")}
        </button>
        <button className="text-button" type="button" onClick={onDetailed}>
          <LayoutList size={16} aria-hidden="true" />
          {t("Detailed view", "विस्तृत दृश्य")}
        </button>
        <button className="text-button" type="button" onClick={onReset}>
          <RefreshCcw size={16} aria-hidden="true" />
          {t("Start over", "फिर से शुरू")}
        </button>
      </div>

      <div className="bubble awaaz">
        <p>
          {t(
            "Who do you want to pay, and how much? Say it any way you like.",
            "किसे कितना भेजना है? जैसे चाहें वैसे बोलें।",
          )}
        </p>
        <form
          className="companion-input"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {listening ? (
            <button
              className="mic-button listening"
              type="button"
              onClick={onStopSpeaking}
              aria-label={t("Stop and use what I said", "रोकें और मेरी बात लें")}
            >
              <Square size={18} aria-hidden="true" />
            </button>
          ) : (
            <button
              className="mic-button"
              type="button"
              onClick={onSpeak}
              aria-label={t("Speak your payment", "अपना भुगतान बोलें")}
            >
              <Mic size={20} aria-hidden="true" />
            </button>
          )}
          <input
            value={transcript}
            onChange={(e) => onTranscript(e.target.value)}
            placeholder={t(
              "e.g. Riya ko 50k sats bhej do",
              "जैसे: रिया को 50 हज़ार सैट्स भेजो",
            )}
            aria-label={t("Payment instruction", "भुगतान निर्देश")}
          />
          <button
            className="send-button"
            type="submit"
            disabled={!transcript.trim()}
            aria-label={t("Send", "भेजें")}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </form>
        <p className="fine-print">
          {listening
            ? t(
                "Listening… stop when you're done.",
                "सुन रहे हैं… बोल लें तो रोकें।",
              )
            : t(
                "Using the microphone sends your audio to OpenAI for transcription.",
                "माइक्रोफ़ोन इस्तेमाल करने पर आपकी आवाज़ लिखने के लिए OpenAI को भेजी जाती है।",
              )}{" "}
          <button className="text-button" type="button" onClick={onPreset}>
            {t("Use demo phrase", "डेमो वाक्य")}
          </button>
        </p>
        {error && !(confirmed && psbtName) && (
          <p className="accessible-warning" role="alert">
            {error}
          </p>
        )}
      </div>

      {hasDraft && (
        <>
          <div className="bubble user">{transcript}</div>
          <div className="bubble awaaz">
            {intentReview}
            {!confirmed && (
              <details className="companion-more">
                <summary>
                  {t(
                    "Add a reason (helps the AI safety check)",
                    "कारण जोड़ें (AI सुरक्षा जाँच में मदद)",
                  )}
                </summary>
                {contextForm}
                <label className="companion-fee">
                  {t("Maximum network fee (sats)", "अधिकतम नेटवर्क शुल्क (सैट्स)")}
                  <input
                    inputMode="numeric"
                    value={feeText}
                    onChange={(e) => onFee(e.target.value)}
                  />
                </label>
              </details>
            )}
          </div>
        </>
      )}

      {confirmed && (
        <div className="bubble awaaz">
          <p>
            {t(
              "Now add the unsigned transaction file (PSBT) from your wallet.",
              "अब अपने वॉलेट से बिना साइन की लेन-देन फ़ाइल (PSBT) जोड़ें।",
            )}
          </p>
          <label className="button secondary small companion-file">
            <FileUp size={16} aria-hidden="true" />
            {t("Choose file", "फ़ाइल चुनें")}
            <input
              type="file"
              accept=".psbt,.txt,application/octet-stream"
              onChange={(e) => {
                onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <div className="companion-demos">
            <span>{t("Or try a demo:", "या डेमो देखें:")}</span>
            {demos.map(([scenario, label]) => (
              <button
                key={scenario}
                type="button"
                className={
                  "chip " +
                  (psbtName === "demo-" + scenario + ".psbt" ? "selected" : "")
                }
                onClick={() => onDemo(scenario)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {confirmed && psbtName && (
        <>
          <div className="bubble user">📄 {psbtName}</div>
          <div className="bubble awaaz">
            {missingProof}
            {verifying ? (
              <p role="status">
                <LoaderCircle className="spin" size={16} aria-hidden="true" />{" "}
                {t("Checking the file…", "फ़ाइल जाँची जा रही है…")}
              </p>
            ) : (
              !hasResult && (
                <button className="button small" type="button" onClick={onVerify}>
                  {t("Check this payment", "यह भुगतान जाँचें")}
                </button>
              )
            )}
            {error && (
              <p className="accessible-warning" role="alert">
                {t("INCOMPLETE — DO NOT SIGN.", "अधूरा — साइन न करें।")}{" "}
                {error}
              </p>
            )}
          </div>
        </>
      )}

      {hasResult && (
        <div className="bubble awaaz result">
          {review}
          {conversation}
        </div>
      )}
      <p className="simple-audio-status" role="status">
        {audioStatus}
      </p>
    </section>
  );
}
