import {
  Mic,
  FileUp,
  ReceiptText,
  EarOff,
  Volume2,
  Square,
  Check,
} from "lucide-react";
import type { Locale } from "../core/types";
export type GuideStep = 1 | 2 | 3;
export function ReviewGuide({
  locale,
  simple,
  quiet,
  step,
  confirmed,
  reviewed,
  fileFirst = false,
  hasTransaction = false,
  onMode,
  onQuiet,
  onStep,
  onRead,
  onStop,
}: {
  locale: Locale;
  simple: boolean;
  quiet: boolean;
  step: GuideStep;
  confirmed: boolean;
  reviewed: boolean;
  fileFirst?: boolean;
  hasTransaction?: boolean;
  onMode: (simple: boolean) => void;
  onQuiet: () => void;
  onStep: (step: GuideStep) => void;
  onRead: (text: string) => void;
  onStop: () => void;
}) {
  const t = (en: string, hi: string) => (locale === "hi-IN" ? hi : en);
  const captions = fileFirst
    ? [
        t(
          "Choose the unsigned PSBT file from your wallet, or try an example below. You can also use a QR image or paste the file data.",
          "अपने वॉलेट की बिना साइन वाली PSBT फ़ाइल चुनें। फ़ाइल नहीं है? नीचे उदाहरण देखें। QR की तस्वीर या पेस्ट किया डेटा भी चलेगा।",
        ),
        t(
          "The file details are shown below in plain language. Read or hear them, then tell us who you meant to pay and how much. We will check whether they match.",
          "नीचे फ़ाइल का हिसाब आसान हिंदी में है। देखें या सुनें। फिर बताएँ कि आप किसे, कितना देना चाहते थे। हम दोनों का मेल जाँचेंगे।",
        ),
        t(
          "See whether the file agrees with your payment. If anything differs or is unknown, do not sign. A match does not prove safety.",
          "देखें कि फ़ाइल आपके भुगतान से मेल खाती है या नहीं। कुछ अलग या अधूरा है तो साइन न करें। मेल सुरक्षा की गारंटी नहीं है।",
        ),
      ]
    : [
        t(
          "Who gets the Bitcoin? How much? Say or type it below. Check the address and fee limit before confirming.",
          "बिटकॉइन किसे और कितना? नीचे बोलें या लिखें। पुष्टि से पहले पता और शुल्क सीमा जाँचें।",
        ),
        t(
          "Bring the unsigned payment file from your wallet. This is a PSBT file. Then press Verify transaction. Awaaz does not send money.",
          "अपने वॉलेट से बिना साइन की भुगतान फ़ाइल लाएँ। इसे PSBT कहते हैं। फिर लेन-देन सत्यापित करें दबाएँ। आवाज़ पैसे नहीं भेजता।",
        ),
        t(
          "Compare what you asked with what the file sends. Check the fee and all other payments. A match is not a promise of safety. A warning means do not sign.",
          "आपके निर्देश और फ़ाइल के भुगतान का मेल देखें। शुल्क और हर अतिरिक्त भुगतान जाँचें। मेल सुरक्षा की गारंटी नहीं। चेतावनी का मतलब: साइन न करें।",
        ),
      ];
  const titles = fileFirst
      ? [
          t("Show the file", "फ़ाइल दिखाएँ"),
          t("Understand the details", "हिसाब समझें"),
          t("Check your payment", "भुगतान जाँचें"),
        ]
      : [
          t("Tell us", "हमें बताएँ"),
          t("Bring the file", "फ़ाइल लाएँ"),
          t("See the result", "परिणाम देखें"),
        ],
    icons = fileFirst
      ? [FileUp, ReceiptText, Check]
      : [Mic, FileUp, ReceiptText];
  return (
    <div className="review-guide">
      <div
        className="review-mode-bar"
        aria-label={t("Review preferences", "जाँच की पसंद")}
      >
        <div className="mode-buttons">
          <button
            type="button"
            aria-pressed={simple}
            onClick={() => onMode(true)}
          >
            {t("Simple view", "सरल दृश्य")}
          </button>
          <button
            type="button"
            aria-pressed={!simple}
            onClick={() => onMode(false)}
          >
            {t("Detailed view", "विस्तृत दृश्य")}
          </button>
        </div>
        <button
          className="quiet-button"
          type="button"
          aria-pressed={quiet}
          onClick={onQuiet}
        >
          <EarOff size={23} aria-hidden="true" />
          {t("Sound off", "आवाज़ बंद")}
          {quiet && <Check size={18} aria-hidden="true" />}
        </button>
      </div>
      {simple && (
        <>
          <nav
            className={"picture-steps" + (fileFirst ? " simple-flowchart" : "")}
            aria-label={t("Payment steps", "भुगतान के चरण")}
          >
            {titles.map((title, i) => {
              const Icon = icons[i];
              return (
                <button
                  type="button"
                  key={i}
                  aria-current={step === i + 1 ? "step" : undefined}
                  disabled={
                    i === 1
                      ? !(fileFirst ? hasTransaction : confirmed)
                      : i === 2
                        ? !reviewed
                        : false
                  }
                  onClick={() => onStep((i + 1) as GuideStep)}
                >
                  <span className="picture-step-number">{i + 1}</span>
                  <Icon size={34} aria-hidden="true" />
                  <span>{title}</span>
                </button>
              );
            })}
          </nav>
          {!fileFirst && (
            <section
              className="step-guidance"
              aria-label={t("Step guidance", "चरण की मदद")}
            >
              <span className="guide-stamp">
                {t("STEP", "चरण")} {step} / 3
              </span>
              <p>{captions[step - 1]}</p>
              <div className="guide-audio-buttons">
                <button
                  type="button"
                  disabled={quiet}
                  onClick={() => onRead(captions[step - 1])}
                >
                  <Volume2 size={24} aria-hidden="true" />
                  {t("Hear this step", "यह चरण सुनें")}
                </button>
                <button type="button" onClick={onStop}>
                  <Square size={17} aria-hidden="true" />
                  {t("Stop audio", "आवाज़ रोकें")}
                </button>
              </div>
              <p className="guide-access-note">
                {quiet
                  ? t(
                      "Sound is off. All instructions and warnings stay on screen.",
                      "आवाज़ बंद है। सारे निर्देश और चेतावनियाँ स्क्रीन पर हैं।",
                    )
                  : t(
                      "Sound is optional. The words you hear are written above.",
                      "सुनना वैकल्पिक है। बोले गए शब्द ऊपर लिखे हैं।",
                    )}
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
