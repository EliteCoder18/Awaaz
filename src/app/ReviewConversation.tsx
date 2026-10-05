import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Mic, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  answerReviewQuestion,
  answerReviewCategory,
  type ReviewAnswer,
} from "../core/reviewConversation";
import { recognizeSpeech } from "../adapters/speechRecognizer";
import { routeGeminiQuestion } from "../adapters/geminiQuestions";
import type {
  Locale,
  LocalizedReport,
  PaymentContext,
  ReviewResult,
} from "../core/types";
export function ReviewConversation({
  result,
  context,
  locale,
  consent,
  interactionEpoch = 0,
  quiet = false,
  onRead,
}: {
  result: ReviewResult;
  context: PaymentContext;
  locale: Locale;
  consent: boolean;
  interactionEpoch?: number;
  quiet?: boolean;
  onRead: (report: LocalizedReport) => void;
}) {
  const t = (en: string, hi: string) => (locale === "hi-IN" ? hi : en);
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<ReviewAnswer>(),
    [asked, setAsked] = useState(""),
    [error, setError] = useState(""),
    [listening, setListening] = useState(false),
    [cloudConsent, setCloudConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [source, setSource] = useState<"local" | "gemini">("local");
  const op = useRef<AbortController | undefined>(undefined);
  const consentRef = useRef(consent);
  consentRef.current = consent;
  const cloudConsentRef = useRef(cloudConsent);
  cloudConsentRef.current = cloudConsent;
  useEffect(() => () => op.current?.abort(), []);
  useEffect(() => {
    const pending = !!op.current;
    op.current?.abort();
    op.current = undefined;
    setListening(false);
    setBusy(false);
    if (pending) {
      setAnswer(undefined);
      setError("");
    }
  }, [consent, interactionEpoch, quiet]);
  useEffect(() => {
    op.current?.abort();
    op.current = undefined;
    setListening(false);
    setBusy(false);
    setAnswer(undefined);
    setError("");
  }, [locale, result, context]);
  const suggestions = [
    t("Who receives this payment?", "यह भुगतान किसे मिलेगा?"),
    t("How much leaves my wallet?", "मेरे वॉलेट से कितना बाहर जाएगा?"),
    t("What is the network fee?", "कितना नेटवर्क शुल्क है?"),
    t("Where is the change?", "चेंज कहाँ है?"),
    t("Does anything look unusual?", "क्या कुछ असामान्य है?"),
    t("What can’t you verify?", "आप क्या सत्यापित नहीं कर सकते?"),
  ];
  async function ask(value = question, useCloud = true) {
    if (!value.trim()) return;
    op.current?.abort();
    op.current = undefined;
    setListening(false);
    setBusy(false);
    setAnswer(undefined);
    setError("");
    setQuestion(value);
    setAsked(value);
    const local = answerReviewQuestion(value, result, context, locale);
    setSource("local");
    // Local safety-limit answers cannot be redirected by an LLM.
    if (!useCloud || !cloudConsent || local.kind === "limits") {
      setAnswer(local);
      return;
    }
    const controller = new AbortController();
    op.current = controller;
    setBusy(true);
    try {
      const category = await routeGeminiQuestion(
        value,
        locale,
        controller.signal,
      );
      if (
        controller.signal.aborted ||
        !cloudConsentRef.current ||
        op.current !== controller
      )
        return;
      setAnswer(answerReviewCategory(category, result, context, locale));
      setSource("gemini");
    } catch {
      if (
        !controller.signal.aborted &&
        cloudConsentRef.current &&
        op.current === controller
      ) {
        setError(
          t(
            "Gemini is unavailable. Showing the local answer instead.",
            "Gemini उपलब्ध नहीं है। स्थानीय उत्तर दिखाया जा रहा है।",
          ),
        );
        setAnswer(local);
      }
    } finally {
      if (op.current === controller) {
        op.current = undefined;
        setBusy(false);
      }
    }
  }
  async function listen() {
    if (!consent || listening) return;
    const controller = new AbortController();
    op.current?.abort();
    op.current = controller;
    setListening(true);
    setError("");
    try {
      const speech = await recognizeSpeech(
        locale,
        undefined,
        10000,
        controller.signal,
      );
      if (!controller.signal.aborted && consentRef.current)
        void ask(speech.transcript);
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          (e instanceof Error ? e.message : "") +
            " " +
            t(
              "Type a question or choose one below.",
              "प्रश्न लिखें या नीचे से चुनें।",
            ),
        );
    } finally {
      if (op.current === controller) {
        op.current = undefined;
        setListening(false);
      }
    }
  }
  return (
    <section
      className="review-conversation"
      aria-labelledby="conversation-heading"
    >
      <div className="conversation-top">
        <span className="eyebrow">
          {t("A CONVERSATION, NOT A GUESS", "अनुमान नहीं, संवाद")}
        </span>
        <span className="fact-source">
          {t("From this review", "इसी जाँच से")}
        </span>
      </div>
      <h3 id="conversation-heading">
        {t("Ask the second question.", "अगला प्रश्न पूछें।")}
      </h3>
      <p>
        {t(
          "You don’t need to read a transaction like an engineer. Ask about the details that matter to you.",
          "इंजीनियर की तरह लेन-देन पढ़ना ज़रूरी नहीं। अपने लिए महत्वपूर्ण विवरण पूछें।",
        )}
      </p>
      <div className="question-suggestions">
        {suggestions.map((q) => (
          <button type="button" key={q} onClick={() => void ask(q, false)}>
            {q}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="gemini-option">
        <label className="gemini-consent" htmlFor="gemini-consent">
          <input
            id="gemini-consent"
            type="checkbox"
            checked={cloudConsent}
            aria-describedby="gemini-disclosure"
            onChange={(e) => {
              op.current?.abort();
              op.current = undefined;
              setBusy(false);
              setListening(false);
              setAnswer(undefined);
              setError("");
              cloudConsentRef.current = e.target.checked;
              setCloudConsent(e.target.checked);
            }}
          />
          <span>
            {t(
              "Use Gemini to understand my questions",
              "मेरे प्रश्न समझने के लिए Gemini इस्तेमाल करें",
            )}
          </span>
        </label>
        <p id="gemini-disclosure">
          {t(
            "Optional: your question text is sent to Google. Do not include addresses, seed words or other private information. We do not send the PSBT, payment transcript or review facts. Google’s free-tier terms may allow product improvement using this text. Answers and numbers still come from this local review; speech uses your browser voice.",
            "वैकल्पिक: आपके प्रश्न का टेक्स्ट Google को भेजा जाएगा। पता, सीड शब्द या निजी जानकारी न लिखें। PSBT, भुगतान निर्देश और जाँच के तथ्य नहीं भेजे जाते। Google की निःशुल्क सेवा की शर्तों के तहत इस टेक्स्ट से उत्पाद सुधार हो सकता है। उत्तर और राशि इसी स्थानीय जाँच से आते हैं; आवाज़ ब्राउज़र की है।",
          )}{" "}
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("Google data terms", "Google की डेटा शर्तें")}
          </a>
        </p>
      </div>
      <form
        aria-busy={busy}
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label htmlFor="review-question">
          {t("Ask about this transaction", "इस लेन-देन के बारे में पूछें")}
        </label>
        <input
          id="review-question"
          value={question}
          maxLength={300}
          onChange={(e) => {
            op.current?.abort();
            op.current = undefined;
            setListening(false);
            setBusy(false);
            setAnswer(undefined);
            setQuestion(e.target.value);
            setError("");
          }}
          placeholder={t(
            "For example: does the recipient match?",
            "जैसे: क्या प्राप्तकर्ता मेल खाता है?",
          )}
        />
        <div className="button-row">
          <button
            type="submit"
            className="button small"
            disabled={!question.trim() || busy}
          >
            {t("Ask Awaaz", "आवाज़ से पूछें")}
          </button>
          <button
            type="button"
            className="button secondary small"
            disabled={!consent || listening || busy}
            onClick={() => void listen()}
          >
            <Mic size={15} aria-hidden="true" />
            {listening
              ? t("Listening…", "सुना जा रहा है…")
              : t("Speak a question", "प्रश्न बोलें")}
          </button>
        </div>
        {!consent && (
          <p className="context-boundary">
            {t(
              "Enable browser-speech consent in your payment instruction to use voice. Suggested questions work without it.",
              "आवाज़ के लिए भुगतान निर्देश में ब्राउज़र-आवाज़ की सहमति दें। सुझाए प्रश्न बिना इसके काम करते हैं।",
            )}
          </p>
        )}
      </form>
      {busy && (
        <div className="gemini-loading">
          <p role="status">
            {t("Understanding your question…", "आपका प्रश्न समझा जा रहा है…")}
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              op.current?.abort();
              op.current = undefined;
              setBusy(false);
              setAnswer(undefined);
            }}
          >
            {t("Cancel question", "प्रश्न रद्द करें")}
          </button>
        </div>
      )}
      {error && (
        <p role="status" className="inline-error">
          {error}
        </p>
      )}
      {answer && (
        <motion.div
          className="conversation-answer"
          key={asked}
          initial={{ x: 4 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.15 }}
          role="status"
        >
          <span className="answer-question">{asked}</span>
          <span className="answer-source">
            {source === "gemini"
              ? t(
                  "Gemini understood the question · answer from checked local facts",
                  "Gemini ने प्रश्न समझा · उत्तर जाँचे स्थानीय तथ्यों से",
                )
              : t(
                  "Answer from checked local facts",
                  "उत्तर जाँचे स्थानीय तथ्यों से",
                )}
          </span>
          <p>{answer.text}</p>
          <button
            type="button"
            className="text-button"
            disabled={quiet}
            onClick={() =>
              onRead({
                title: asked,
                instruction: "",
                details: [],
                speech: answer.text,
              })
            }
          >
            <Volume2 size={15} aria-hidden="true" />
            {t("Hear this answer", "उत्तर सुनें")}
          </button>
        </motion.div>
      )}
      <p className="context-boundary">
        {t(
          "Checked facts and honest limits. Gemini can interpret an opted-in question, never change the verdict or approve signing. Suggested questions always stay local. Not a general-purpose AI chat.",
          "जाँचे तथ्य और स्पष्ट सीमाएँ। सहमति पर Gemini प्रश्न समझ सकता है, निर्णय बदल या साइन की अनुमति नहीं दे सकता। सुझाए प्रश्न स्थानीय हैं। सामान्य AI चैट नहीं।",
        )}
      </p>
    </section>
  );
}
