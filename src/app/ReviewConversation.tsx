import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Mic, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { recognizeSpeech } from "../adapters/speechRecognizer";
import { routeGeminiQuestion } from "../adapters/geminiQuestions";
import { routeOpenAIConversation } from "../adapters/openaiConversation";
import { fetchFeeContext, isFeeContextFresh, type FeeContext } from "../adapters/feeContext";
import { localConversationPlan, type ConversationPlan } from "../core/conversationTopics";
import { answerTransaction, type TransactionAnswer } from "../core/transactionConversation";
import type { Locale, LocalizedReport, PaymentContext, ReviewResult, TransactionFacts } from "../core/types";

type Provider = "local" | "openai" | "gemini";
interface Turn {
  question: string;
  answer: TransactionAnswer;
  source: Provider;
  feeTime?: number;
}
export function ReviewConversation({ result, facts, context, locale, consent, interactionEpoch = 0, quiet = false, onRead }: {
  result?: ReviewResult;
  facts?: TransactionFacts;
  context: PaymentContext;
  locale: Locale;
  consent: boolean;
  interactionEpoch?: number;
  quiet?: boolean;
  onRead: (report: LocalizedReport) => void;
}) {
  const t = (en: string, hi: string) => locale === "hi-IN" ? hi : en;
  const currentFacts = facts ?? result?.facts;
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [provider, setProvider] = useState<Provider>("local");
  const [cloudConsent, setCloudConsent] = useState(false);
  const [networkConsent, setNetworkConsent] = useState(false);
  const [fees, setFees] = useState<FeeContext>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [feeBusy, setFeeBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [now, setNow] = useState(Date.now());
  const op = useRef<AbortController | undefined>(undefined);
  const feeOp = useRef<AbortController | undefined>(undefined);
  const consentRef = useRef(consent);
  consentRef.current = consent;
  const cloudRef = useRef(cloudConsent);
  cloudRef.current = cloudConsent;
  const providerRef = useRef(provider);
  providerRef.current = provider;
  const turnsRef = useRef(turns);
  turnsRef.current = turns;

  function cancelQuestion() {
    op.current?.abort();
    op.current = undefined;
    setBusy(false);
    setListening(false);
  }
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 10000);
    return () => { clearInterval(tick); op.current?.abort(); feeOp.current?.abort(); };
  }, []);
  useEffect(() => {
    cancelQuestion();
    setTurns([]);
    turnsRef.current = [];
    setQuestion("");
    setError("");
  }, [locale, result, currentFacts, context]);
  useEffect(() => { cancelQuestion(); }, [consent, interactionEpoch, quiet]);

  async function loadFees() {
    feeOp.current?.abort();
    cancelQuestion();
    const controller = new AbortController();
    feeOp.current = controller;
    setFeeBusy(true);
    setFees(undefined);
    setError("");
    try {
      const data = await fetchFeeContext(controller.signal);
      if (!controller.signal.aborted && feeOp.current === controller) {
        setFees(data);
        setNow(Date.now());
      }
    } catch {
      if (!controller.signal.aborted) setError(t("Mempool estimates are unavailable. I can still explain the file; live fee comparisons and timing need a fresh snapshot.", "Mempool अनुमान उपलब्ध नहीं हैं। फ़ाइल समझा सकता हूँ; शुल्क तुलना और समय के लिए ताज़ा जानकारी चाहिए।"));
    } finally {
      if (feeOp.current === controller) { feeOp.current = undefined; setFeeBusy(false); }
    }
  }
  async function ask(value = question, useCloud = true) {
    if (!value.trim() || !currentFacts || feeBusy) return;
    cancelQuestion();
    setQuestion(value);
    setError("");
    const local = localConversationPlan(value);
    const previous = turnsRef.current.at(-1);
    let plan: ConversationPlan = local;
    let source: Provider = "local";
    const controller = new AbortController();
    op.current = controller;
    setBusy(true);
    try {
      // Suggested prompts stay local. Signing/safety questions cannot be redirected.
      // OpenAI handles compound questions and follow-ups without financial context.
      if (useCloud && cloudConsent && !local.topics.includes("limits") && provider !== "local") {
        if (provider === "openai") {
          plan = await routeOpenAIConversation({ question: value, locale, previousQuestion: previous?.question ?? "", previousTopics: previous?.answer.topics ?? [] }, controller.signal);
          source = "openai";
        } else if (local.topics[0] === "unsupported") {
          const category = await routeGeminiQuestion(value, locale, controller.signal);
          plan = { topics: [category] };
          source = "gemini";
        }
        if (!cloudRef.current || providerRef.current !== provider) return;
      }
    } catch {
      if (controller.signal.aborted) return;
      setError(t("AI understanding is unavailable. Showing the local response; rephrase or choose a suggested question.", "AI प्रश्न समझ सेवा उपलब्ध नहीं है। स्थानीय उत्तर दिखा रहा हूँ; प्रश्न फिर लिखें या सुझाया प्रश्न चुनें।"));
      plan = local;
      source = "local";
    } finally {
      if (op.current === controller) { op.current = undefined; setBusy(false); }
    }
    if (controller.signal.aborted) return;
    const answer = answerTransaction({ plan, facts: currentFacts, result, context, locale, fees: networkConsent ? fees : undefined });
    const turn: Turn = { question: value, answer, source, feeTime: answer.usesNetwork ? fees?.fetchedAt : undefined };
    setTurns((items) => [...items.slice(-7), turn]);
  }
  async function listen() {
    if (!consent || listening || busy || feeBusy) return;
    cancelQuestion();
    const controller = new AbortController();
    op.current = controller;
    setListening(true);
    setError("");
    try {
      const speech = await recognizeSpeech(locale, undefined, 10000, controller.signal);
      if (!controller.signal.aborted && consentRef.current) void ask(speech.transcript);
    } catch {
      if (!controller.signal.aborted) setError(t("Voice is unavailable. Type your question or choose a prompt.", "आवाज़ उपलब्ध नहीं है। प्रश्न लिखें या सुझाया प्रश्न चुनें।"));
    } finally {
      if (op.current === controller) { op.current = undefined; setListening(false); }
    }
  }
  const suggestions = [
    t("What am I signing?", "मैं क्या साइन कर रहा हूँ?"),
    t("Is this fee too high?", "क्या शुल्क ज़्यादा है?"),
    t("How long will it take to confirm?", "पुष्टि में कितना समय लगेगा?"),
    t("Can I pay less if I wait?", "इंतज़ार करूँ तो कम शुल्क दे सकता हूँ?"),
    t("Who receives this payment?", "यह भुगतान किसे मिलेगा?"),
    t("Does anything look unusual?", "क्या कुछ असामान्य है?"),
  ];
  if (!currentFacts) return null;
  return (
    <section className="review-conversation" aria-labelledby="conversation-heading">
      <div className="conversation-top">
        <span className="eyebrow">{t("YOUR TRANSACTION, IN YOUR WORDS", "अपनी भाषा में अपना लेन-देन")}</span>
        <span className="fact-source">{result ? t("Reviewed facts", "जाँचे तथ्य") : t("File facts · not compared yet", "फ़ाइल के तथ्य · मेल जाँच बाकी")}</span>
      </div>
      <h3 id="conversation-heading">{t("Let’s talk through this payment.", "इस भुगतान को मिलकर समझें।")}</h3>
      <p>{t("Ask normally in Hindi, English or Hinglish: what am I paying, is the fee high, or how long might confirmation take? With OpenAI enabled, ask follow-up questions without repeating everything.", "हिंदी, अंग्रेज़ी या हिंग्लिश में सामान्य ढंग से पूछें: कितना भुगतान है, शुल्क ज़्यादा है या पुष्टि कब हो सकती है? OpenAI चालू होने पर सब दोहराए बिना अगला प्रश्न पूछें।")}</p>
      <div className="question-suggestions">
        {suggestions.map((q) => <button type="button" key={q} disabled={busy || feeBusy} onClick={() => void ask(q, false)}>{q}<ArrowUpRight size={15} aria-hidden="true" /></button>)}
      </div>
      <details className="conversation-settings" open>
        <summary>{t("Conversation and network settings", "संवाद और नेटवर्क सेटिंग")}</summary>
        <label htmlFor="conversation-provider">{t("Question understanding", "प्रश्न समझने की सेवा")}</label>
        <select id="conversation-provider" value={provider} onChange={(e) => {
          cancelQuestion();
          const value = e.target.value as Provider;
          providerRef.current = value;
          cloudRef.current = false;
          setProvider(value);
          setCloudConsent(false);
          setTurns([]);
          turnsRef.current = [];
          setError("");
        }}>
          <option value="local">{t("Local · no API key", "स्थानीय · API कुंजी नहीं")}</option>
          <option value="openai">OpenAI · {t("conversation and follow-ups", "संवाद और अगले प्रश्न")}</option>
          <option value="gemini">Gemini · {t("single-question fallback", "एक प्रश्न की मदद")}</option>
        </select>
        {provider !== "local" && <>
          <label className="check-label" htmlFor="conversation-cloud-consent">
            <input id="conversation-cloud-consent" type="checkbox" checked={cloudConsent} aria-describedby="conversation-cloud-disclosure" onChange={(e) => {
              cancelQuestion(); cloudRef.current = e.target.checked; setCloudConsent(e.target.checked);
              setTurns([]); turnsRef.current = []; setError("");
            }} />
            {provider === "openai" ? t("Allow OpenAI to understand my questions and follow-ups", "मेरे प्रश्न और अगले प्रश्न OpenAI से समझने की अनुमति दें") : t("Let Gemini help when wording is not understood locally", "स्थानीय रूप से प्रश्न न समझ आने पर Gemini की मदद लें")}
          </label>
          <p id="conversation-cloud-disclosure" className="context-boundary">
            {provider === "openai" ? t("Typed or recognized question text, the previous question, previous topic labels and language go to OpenAI. PSBT bytes, addresses, payment instructions and financial facts are not attached. Anything you include in a question is still sent: use no seed words, addresses or private details. The API key stays on the server. OpenAI chooses topics; Awaaz supplies financial answers locally.", "प्रश्न का टेक्स्ट, पिछला प्रश्न, पिछले विषय और भाषा OpenAI को जाते हैं। PSBT, पते, भुगतान निर्देश और वित्तीय तथ्य साथ नहीं भेजे जाते। प्रश्न में लिखी हर बात फिर भी भेजी जाती है: सीड, पता या निजी जानकारी न लिखें। API कुंजी सर्वर पर रहती है। OpenAI विषय चुनता है; वित्तीय उत्तर आवाज़ स्थानीय रूप से देता है।") : t("Only an unrecognized question and language go to Google. No transaction context is attached. Google’s data terms apply; do not put private information in a question.", "केवल न समझा गया प्रश्न और भाषा Google को जाते हैं। लेन-देन का संदर्भ साथ नहीं भेजा जाता। Google की डेटा शर्तें लागू हैं; निजी जानकारी प्रश्न में न लिखें।")}
          </p>
        </>}
        <label className="check-label" htmlFor="conversation-network-consent">
          <input id="conversation-network-consent" type="checkbox" checked={networkConsent} aria-describedby="conversation-network-disclosure" onChange={(e) => {
            cancelQuestion(); setNetworkConsent(e.target.checked);
            if (e.target.checked) void loadFees();
            else { feeOp.current?.abort(); feeOp.current = undefined; setFeeBusy(false); setFees(undefined); setTurns([]); turnsRef.current = []; }
          }} />
          {t("Use public mempool estimates for fee and timing questions", "शुल्क और समय के लिए सार्वजनिक mempool अनुमान लें")}
        </label>
        <p id="conversation-network-disclosure" className="context-boundary">{t("No mempool API key needed. Only a public testnet3 fee snapshot is fetched; no transaction, address or question is sent to mempool. This app uses a testnet context and cannot infer a PSBT’s actual chain.", "mempool API कुंजी नहीं चाहिए। केवल सार्वजनिक testnet3 शुल्क जानकारी ली जाती है; लेन-देन, पता या प्रश्न mempool को नहीं भेजते। ऐप टेस्टनेट संदर्भ इस्तेमाल करता है और PSBT की वास्तविक चेन नहीं पहचान सकता।")}</p>
        {networkConsent && <button type="button" className="button secondary small" disabled={feeBusy || busy} onClick={() => void loadFees()}>{feeBusy ? t("Loading estimates…", "अनुमान लोड हो रहे हैं…") : t("Refresh mempool estimates", "mempool अनुमान फिर लें")}</button>}
      </details>
      {fees && <p className="fee-provenance" role="status">
        {isFeeContextFresh(fees, now) ? t("Fee snapshot", "शुल्क जानकारी") : t("STALE — refresh before comparing", "पुराना — तुलना से पहले फिर लें")} · {new Date(fees.fetchedAt).toLocaleTimeString(locale)} · testnet3 · <a href={fees.source} target="_blank" rel="noreferrer">mempool.space</a>
      </p>}
      <div className="conversation-history" role="log" tabIndex={0} aria-label={t("Payment conversation", "भुगतान संवाद")} aria-live="polite" aria-relevant="additions">
        {turns.map((turn, index) => <motion.div className="conversation-answer" key={index} initial={{ x: 4 }} animate={{ x: 0 }} transition={{ duration: 0.15 }}>
          <span className="answer-question">{turn.question}</span>
          <span className="answer-source">{turn.source === "local" ? t("Local understanding · answer from this file", "स्थानीय समझ · उत्तर इसी फ़ाइल से") : (turn.source === "openai" ? "OpenAI" : "Gemini") + " · " + t("question understanding only · local financial answer", "केवल प्रश्न समझ · वित्तीय उत्तर स्थानीय")}</span>
          {turn.answer.paragraphs.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          {turn.feeTime !== undefined && <p className="fee-provenance">{t("Uses fee snapshot at", "शुल्क जानकारी का समय")} {new Date(turn.feeTime).toLocaleTimeString(locale)} · testnet3 · {t("Estimates can change.", "अनुमान बदल सकते हैं।")}</p>}
          <button type="button" className="text-button" disabled={quiet} onClick={() => onRead({ title: turn.question, instruction: "", details: [], speech: turn.answer.paragraphs.join(" ") })}><Volume2 size={15} aria-hidden="true" />{t("Hear this answer", "उत्तर सुनें")}</button>
        </motion.div>)}
      </div>
      <form aria-busy={busy} onSubmit={(e) => { e.preventDefault(); void ask(); }}>
        <label htmlFor="review-question">{t("Ask about this transaction", "इस लेन-देन के बारे में पूछें")}</label>
        <input id="review-question" value={question} maxLength={provider === "gemini" ? 300 : 500} onChange={(e) => { cancelQuestion(); setQuestion(e.target.value); setError(""); }} placeholder={t("Is the fee high, and what if I can wait?", "क्या शुल्क ज़्यादा है, और अगर मैं इंतज़ार कर सकूँ?")} />
        <div className="button-row">
          <button type="submit" className="button small" disabled={!question.trim() || busy || feeBusy}>{t("Ask Awaaz", "आवाज़ से पूछें")}</button>
          <button type="button" className="button secondary small" disabled={!consent || listening || busy || feeBusy} onClick={() => void listen()}><Mic size={15} aria-hidden="true" />{listening ? t("Listening…", "सुना जा रहा है…") : t("Speak a question", "प्रश्न बोलें")}</button>
          {turns.length > 0 && <button type="button" className="text-button" onClick={() => { cancelQuestion(); setTurns([]); turnsRef.current = []; setQuestion(""); }}>{t("Clear conversation", "संवाद मिटाएँ")}</button>}
        </div>
        {!consent && <p className="context-boundary">{t("Voice needs browser-speech consent in the payment instruction section. Typing always works.", "आवाज़ के लिए भुगतान निर्देश वाले भाग में ब्राउज़र-आवाज़ की सहमति चाहिए। लिखना हमेशा काम करता है।")}</p>}
      </form>
      {(busy || listening || feeBusy) && <div className="gemini-loading"><p role="status">{listening ? t("Listening…", "सुना जा रहा है…") : feeBusy ? t("Loading public fee estimates…", "सार्वजनिक शुल्क जानकारी ली जा रही है…") : t("Understanding your question…", "आपका प्रश्न समझा जा रहा है…")}</p>{!feeBusy && <button type="button" className="text-button" onClick={cancelQuestion}>{t("Cancel question", "प्रश्न रद्द करें")}</button>}</div>}
      {error && <p role="status" className="inline-error">{error}</p>}
      <p className="context-boundary">{result ? t("The review verdict still applies. AI cannot change it, confirm payment intent or approve signing. Fee rates and confirmation timing are estimates, not guarantees.", "जाँच का निर्णय लागू है। AI इसे बदल, निर्देश की पुष्टि या साइन की अनुमति नहीं दे सकता। शुल्क दर और पुष्टि का समय अनुमान हैं, गारंटी नहीं।") : t("This is a file explanation, not an intent comparison. Confirm your intended recipient, amount and fee limit, then verify. Do not sign yet.", "यह फ़ाइल का विवरण है, निर्देश से मेल जाँच नहीं। अपना प्राप्तकर्ता, राशि और शुल्क सीमा पुष्टि करके सत्यापन करें। अभी साइन न करें।")}</p>
    </section>
  );
}
