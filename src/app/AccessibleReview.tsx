import { useEffect, useMemo, useRef, useState } from "react";
import { Ear, FileUp, Volume2, Square, ArrowRight, Download } from "lucide-react";
import { parsePsbt } from "../core/psbtParser";
import type { Locale, LocalizedReport } from "../core/types";
import type { FinalVerdict } from "../core/finalVerdict";
import type { WorkflowState } from "./workflow";
import type { GuideStep } from "./ReviewGuide";

export function AccessibleReview({
  state, finalVerdict, localized, active, quiet, step, rate, onRate, onRead, onStop,
  onSoundOn, onStep, onCompare, onDemo, onLanguage,
}: {
  state: WorkflowState;
  finalVerdict?: FinalVerdict;
  localized?: LocalizedReport;
  active: boolean;
  quiet: boolean;
  step: GuideStep;
  rate: number;
  onRate: (rate: number) => void;
  onRead: (text: string) => void;
  onStop: () => void;
  onSoundOn: () => void;
  onStep: (step: GuideStep) => void;
  onCompare: () => void;
  onDemo: () => void;
  onLanguage: (locale: Locale) => void;
}) {
  const hi = state.locale === "hi-IN";
  const t = (en: string, hindi: string) => hi ? hindi : en;
  const unit = t("sats", "सैट्स");
  const [automatic, setAutomatic] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [acknowledgements, setAcknowledgements] = useState<{ binding: string; items: boolean[] }>({ binding: "", items: [] });
  const readRef = useRef(onRead);
  readRef.current = onRead;
  const facts = useMemo(() => {
    if (!state.psbtBytes) return undefined;
    try {
      const parsed = parsePsbt(state.psbtBytes, state.profile, state.evidence);
      return parsed.warnings.some((warning) => warning.code === "UNSUPPORTED_PSBT_VERSION") ? undefined : parsed;
    } catch {
      return undefined;
    }
  }, [state.psbtBytes, state.profile, state.evidence]);
  const format = (amount: bigint | undefined) => amount === undefined
    ? t("unknown", "पता नहीं") : `${amount.toLocaleString(state.locale)} ${unit}`;
  const outputs = facts?.outputs.map((output) => {
    const contact = state.profile.addressBook.find((entry) => entry.scriptHexes.includes(output.scriptHex));
    const title = output.classification === "change"
      ? t("Remaining Bitcoin at the configured change address", "बचे हुए बिटकॉइन के लिए बताया गया पता")
      : output.classification === "op_return"
        ? t("Data output", "डेटा वाला हिस्सा")
        : contact?.displayName ?? t("Unrecognized recipient", "अनजान प्राप्तकर्ता");
    const address = output.displayAddress ?? output.scriptHex;
    const note = output.classification === "change"
      ? t("This matches a configured change address. It does not prove that you own it.", "यह बताए गए चेंज पते से मिलता है। यह साबित नहीं करता कि पता आपका है।")
      : output.classification === "op_return"
        ? t("This contains data, not a payment to a person.", "इसमें डेटा है। यह किसी व्यक्ति को भुगतान नहीं है।")
        : contact
          ? t("This name comes from your address book. Independently confirm the full address with the recipient.", "नाम आपकी पता सूची से आया है। प्राप्तकर्ता से अलग से पूरे पते की पुष्टि करें।")
          : t("This address is not in your address book. Do not assume who owns it.", "यह पता आपकी सूची में नहीं है। इसका मालिक कौन है, यह अनुमान न लगाएँ।");
    return { ...output, title, address, note };
  }) ?? [];
  const fee = facts?.evidenceComplete ? facts.feeSats : undefined;
  const totalLeaving = facts && fee !== undefined
    ? facts.outputs.filter((output) => output.classification !== "change").reduce((sum, output) => sum + output.valueSats, fee)
    : undefined;
  const transactionSpeech = facts
    ? [
        t("Here is what your unsigned file contains. Amounts are Bitcoin sats, not rupees.", "आपकी बिना साइन की फ़ाइल में यह लिखा है। राशि बिटकॉइन के सैट्स में है, रुपये में नहीं।"),
        ...outputs.map((output) => `${t("Output", "हिस्सा")} ${output.index + 1}. ${output.title}. ${format(output.valueSats)}. ${output.note}`),
        `${t("Network fee", "नेटवर्क शुल्क")}: ${format(fee)}.`,
        `${t("Total leaving, excluding configured change", "बताए गए चेंज को छोड़कर कुल खर्च")}: ${format(totalLeaving)}.`,
        facts.warnings.length ? t("Some information is missing or needs further review. Do not sign.", "कुछ जानकारी अधूरी है या उसे और जाँचने की ज़रूरत है। साइन न करें।") : "",
      ].filter(Boolean).join(" ")
    : state.psbtBytes
      ? t("This file could not be read. Do not sign. Choose an unsigned PSBT version zero file from your wallet.", "यह फ़ाइल पढ़ी नहीं जा सकी। साइन न करें। वॉलेट से बिना साइन की PSBT संस्करण शून्य फ़ाइल चुनें।")
      : t("Welcome to accessible review. First choose the unsigned PSBT file prepared by your wallet. You can try the example if you do not have a file. Next hear every payment and the network fee, then compare with your intended payment. Awaaz never signs or sends money. Use Tab to move between controls and Enter or Space to activate them.", "सुलभ जाँच में आपका स्वागत है। पहले वॉलेट की बनाई बिना साइन की PSBT फ़ाइल चुनें। फ़ाइल नहीं है तो उदाहरण इस्तेमाल करें। फिर हर भुगतान और शुल्क सुनें। उसके बाद अपने चाहे हुए भुगतान से मेल जाँचें। आवाज़ साइन नहीं करता और पैसे नहीं भेजता। अगले नियंत्रण पर जाने के लिए टैब और उसे दबाने के लिए एंटर या स्पेस इस्तेमाल करें।");
  const fileSpeech = facts
    ? `${transactionSpeech} ${t("The file has not been compared with your intended payment yet. Do not sign. Continue to tell us who you meant to pay, how much, and your maximum fee.", "फ़ाइल का आपके चाहे हुए भुगतान से मेल अभी नहीं जाँचा गया है। साइन न करें। आगे बताएँ कि किसे कितना देना चाहते हैं और अधिकतम शुल्क कितना है।")}`
    : transactionSpeech;
  const nextSpeech = state.intent
    ? `${t("Your intended payment is confirmed.", "आपके चाहे हुए भुगतान की पुष्टि हो गई है।")} ${state.profile.addressBook.find((entry) => entry.id === state.intent?.recipientAlias)?.displayName ?? state.intent.recipientAlias}. ${format(state.intent.amountSats)}. ${t("Maximum fee", "अधिकतम शुल्क")}: ${format(state.intent.policy.maxFeeSats)}. ${t("Press Verify transaction to compare it with the file.", "फ़ाइल से मेल जाँचने के लिए लेन-देन सत्यापित करें दबाएँ।")}`
    : "";
  const narration = state.error
    ? `${t("Review incomplete. Do not sign.", "जाँच अधूरी है। साइन न करें।")} ${state.error}`
    : localized
      ? `${localized.title}. ${localized.instruction} ${transactionSpeech} ${localized.speech} ${t("Signing remains in your wallet. A match does not prove ownership, unspent funds, or safety.", "साइन आपके वॉलेट में होगा। मेल पता किसका है, पैसे खर्च नहीं हुए हैं या भुगतान सुरक्षित है, यह साबित नहीं करता।")}`
      : nextSpeech || fileSpeech;
  useEffect(() => {
    if (automatic && active && !quiet) readRef.current(narration);
  }, [automatic, active, quiet, narration, rate]);
  const binding = `${state.sessionId}:${state.revision}:${state.result?.receipt.binding.psbtHash ?? ""}`;
  const items = acknowledgements.binding === binding ? acknowledgements.items : [];
  const understood = items.length === 3 && items.every(Boolean);
  const matched = finalVerdict
    ? finalVerdict === "GO"
    : state.result?.receipt.report.verdict === "MATCH";
  const checklist = [
    t("I independently confirmed the recipient’s full address.", "मैंने प्राप्तकर्ता के पूरे पते की अलग से पुष्टि की है।"),
    t("I understand the amount, fee, change, and every other output.", "मैं राशि, शुल्क, चेंज और हर दूसरे हिस्से को समझता हूँ।"),
    t("I will compare this same transaction in my wallet before deciding to sign.", "साइन का निर्णय लेने से पहले मैं वॉलेट में इसी लेन-देन का मिलान करूँगा।"),
  ];
  function focusUpload() {
    onStep(1);
    requestAnimationFrame(() => {
      const input = document.getElementById("psbt-file") as HTMLInputElement | null;
      const details = input?.closest("details");
      if (details) details.open = true;
      input?.focus();
      input?.click();
    });
  }
  function spellAddress(address: string) {
    const hindiLetters: Record<string, string> = {
      a: "ए", b: "बी", c: "सी", d: "डी", e: "ई", f: "एफ", g: "जी",
      h: "एच", i: "आई", j: "जे", k: "के", l: "एल", m: "एम", n: "एन",
      o: "ओ", p: "पी", q: "क्यू", r: "आर", s: "एस", t: "टी", u: "यू",
      v: "वी", w: "डबल्यू", x: "एक्स", y: "वाई", z: "ज़ेड",
    };
    const digits = hi
      ? ["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ"]
      : ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    const spelling = Array.from(address).map((character) => /[A-Z]/.test(character)
      ? `${t("uppercase", "बड़ा अक्षर")} ${hi ? hindiLetters[character.toLowerCase()] : character}`
      : /[a-z]/.test(character)
        ? `${t("lowercase", "छोटा अक्षर")} ${hi ? hindiLetters[character] : character}`
        : /[0-9]/.test(character) ? digits[Number(character)] : character).join(". ");
    onRead(`${t("Full address, character by character", "पूरा पता, एक-एक अक्षर")}. ${spelling}`);
  }
  function downloadSummary() {
    const summary = [t("Awaaz accessible transaction review — testnet", "आवाज़ सुलभ लेन-देन जाँच — टेस्टनेट"),
      state.psbtName ?? "", ...outputs.map((output) => `${output.title}: ${format(output.valueSats)}\n${output.address}\n${output.note}`),
      `${t("Network fee", "नेटवर्क शुल्क")}: ${format(fee)}`,
      `${t("Total leaving, excluding configured change", "बताए गए चेंज को छोड़कर कुल खर्च")}: ${format(totalLeaving)}`,
      nextSpeech,
      narration,
      t("This is a local explanation, not a signed safety certificate. Signing stays in your wallet.", "यह स्थानीय विवरण है, साइन किया सुरक्षा प्रमाणपत्र नहीं। साइन आपके वॉलेट में होता है।")].join("\n\n");
    const url = URL.createObjectURL(new Blob([summary], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "awaaz-accessible-review.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadStatus(t("Your readable summary has been downloaded as a text file.", "पढ़ने योग्य विवरण टेक्स्ट फ़ाइल के रूप में डाउनलोड हो गया है।"));
  }
  return (
    <section className="accessible-review" aria-labelledby="accessible-review-heading" lang={hi ? "hi" : "en"}>
      <div className="accessible-heading">
        <Ear size={32} aria-hidden="true" />
        <div>
          <span>{t("ACCESSIBLE REVIEW", "सुलभ जाँच")}</span>
          <h2 id="accessible-review-heading" tabIndex={-1}>{t("Your payment, explained aloud.", "अपना भुगतान सुनकर समझें।")}</h2>
        </div>
      </div>
      <p>{t("Large text, high contrast, and a keyboard-friendly review. A screen reader can access every detail. Spoken guidance is optional; only the mode preference is remembered.", "बड़े अक्षर, साफ़ रंग और कीबोर्ड से आसान जाँच। स्क्रीन रीडर से हर विवरण उपलब्ध है। बोलकर मदद वैकल्पिक है; केवल इस मोड की पसंद याद रखी जाती है।")}</p>
      <div className="accessible-audio-controls">
        <label htmlFor="accessible-language">{t("Guidance language", "मदद की भाषा")}
          <select id="accessible-language" value={state.locale} onChange={(event) => {
            onStop();
            setDownloadStatus("");
            onLanguage(event.target.value as Locale);
          }}>
            <option value="en-IN">English</option>
            <option value="hi-IN">हिंदी</option>
          </select>
        </label>
        <button type="button" className="button" aria-pressed={automatic} onClick={() => {
          if (automatic) { setAutomatic(false); onStop(); }
          else { onSoundOn(); setAutomatic(true); }
        }}>
          <Volume2 aria-hidden="true" size={22} />
          {automatic ? t("Turn spoken guidance off", "बोलकर मदद बंद करें") : t("Start spoken guidance", "बोलकर मदद शुरू करें")}
        </button>
        <button type="button" className="button secondary" disabled={quiet} onClick={() => onRead(narration)}>{t("Repeat explanation", "फिर से सुनाएँ")}</button>
        <button type="button" className="button secondary" onClick={() => { setAutomatic(false); onStop(); }}><Square aria-hidden="true" size={18} />{t("Stop audio", "आवाज़ रोकें")}</button>
        <label htmlFor="accessible-speech-rate">{t("Speaking speed", "बोलने की गति")}
          <select id="accessible-speech-rate" value={rate} onChange={(event) => { onStop(); onRate(Number(event.target.value)); }}>
            <option value="0.5">{t("Very slow · 0.5×", "बहुत धीमी · 0.5×")}</option>
            <option value="0.65">{t("Slow · 0.65×", "धीमी · 0.65×")}</option>
            <option value="0.9">{t("Normal · 0.9×", "सामान्य · 0.9×")}</option>
            <option value="1.1">{t("Faster · 1.1×", "तेज़ · 1.1×")}</option>
            <option value="1.3">{t("Fast · 1.3×", "बहुत तेज़ · 1.3×")}</option>
          </select>
        </label>
        <button type="button" className="button secondary" disabled={!state.psbtBytes} onClick={downloadSummary} aria-describedby="accessible-download-help">
          <Download aria-hidden="true" size={22} />{t("Download summary (.txt)", "विवरण डाउनलोड करें (.txt)")}
        </button>
      </div>
      <p id="accessible-download-help">{state.psbtBytes
        ? t("The summary includes every output and full address, the fee, total, intended payment, and current review warnings in your selected language.", "विवरण में चुनी भाषा में हर हिस्सा, पूरे पते, शुल्क, कुल खर्च, इच्छित भुगतान और जाँच की मौजूदा चेतावनियाँ शामिल हैं।")
        : t("Choose a PSBT file or try the example to enable the summary download.", "विवरण डाउनलोड करने के लिए PSBT फ़ाइल चुनें या उदाहरण आज़माएँ।")}</p>
      <p role="status" aria-live="polite">{downloadStatus}</p>
      <p className="accessible-audio-note">{t("Browser speech may use a remote provider. If a matching voice is unavailable, use your screen reader; the complete text is always available below.", "ब्राउज़र की आवाज़ बाहरी सेवा इस्तेमाल कर सकती है। चुनी भाषा की आवाज़ उपलब्ध न हो तो स्क्रीन रीडर इस्तेमाल करें। पूरा विवरण नीचे हमेशा मौजूद है।")}</p>
      <nav className="accessible-step-nav" aria-label={t("Accessible review steps", "सुलभ जाँच के चरण")}>
        <button type="button" aria-current={step === 1 ? "step" : undefined} onClick={focusUpload}><FileUp aria-hidden="true" size={22} />{t("1. Choose your file", "१. फ़ाइल चुनें")}</button>
        <button type="button" disabled={!state.psbtBytes} aria-current={step === 2 ? "step" : undefined} onClick={() => onStep(2)}>{t("2. Hear the details", "२. हिसाब सुनें")}</button>
        <button type="button" disabled={!state.result} aria-current={step === 3 ? "step" : undefined} onClick={() => onStep(3)}>{t("3. Before signing", "३. साइन से पहले")}</button>
      </nav>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{state.error ?? (localized ? `${localized.title}. ${localized.instruction}` : state.intent ? nextSpeech : state.psbtBytes ? t("File loaded. Its details are available below.", "फ़ाइल आ गई है। उसका हिसाब नीचे उपलब्ध है।") : t("Choose a file to begin.", "शुरू करने के लिए फ़ाइल चुनें।"))}</p>
      {!state.psbtBytes ? <div className="accessible-start">
        <p>{fileSpeech}</p>
        <button type="button" className="button secondary" onClick={onDemo}>{t("Try an example payment", "उदाहरण भुगतान आज़माएँ")}</button>
      </div> : <>
        <h3>{t("Every part of this transaction", "इस लेन-देन का हर हिस्सा")}</h3>
        <p>{t("Amounts are Bitcoin sats, not rupees.", "राशि बिटकॉइन के सैट्स में है, रुपये में नहीं।")}</p>
        {!facts && <p role="alert">{fileSpeech}</p>}
        <ol className="accessible-output-list">
          {outputs.map((output) => <li key={output.index}>
            <h4>{output.title}</h4><strong>{format(output.valueSats)}</strong><p>{output.note}</p>
            <span>{t(output.displayAddress ? "Full address" : "Output script", output.displayAddress ? "पूरा पता" : "आउटपुट स्क्रिप्ट")}</span>
            <code>{output.address}</code>
            <div className="button-row">
              <button type="button" className="button secondary" disabled={quiet} onClick={() => onRead(`${output.title}. ${format(output.valueSats)}. ${output.note}`)} aria-label={t(`Hear output ${output.index + 1}: ${output.title}`, `हिस्सा ${output.index + 1} सुनें: ${output.title}`)}>{t("Hear this payment", "यह हिस्सा सुनें")}</button>
              <button type="button" className="button secondary" disabled={quiet} onClick={() => spellAddress(output.address)} aria-label={t(`Read the full address for output ${output.index + 1}`, `हिस्सा ${output.index + 1} का पूरा पता सुनें`)}>{t("Spell full address", "पूरा पता अक्षर-अक्षर सुनें")}</button>
            </div>
          </li>)}
        </ol>
        {facts && <dl className="accessible-totals">
          <div><dt>{t("Network fee", "नेटवर्क शुल्क")}</dt><dd>{format(fee)}</dd></div>
          <div><dt>{t("Total leaving, excluding configured change", "बताए गए चेंज को छोड़कर कुल खर्च")}</dt><dd>{format(totalLeaving)}</dd></div>
        </dl>}
        {facts && facts.warnings.length > 0 && <p className="accessible-warning">{t("Some information is missing or needs further review. A fee is only shown when previous transaction evidence is complete. Do not sign until the review is complete.", "कुछ जानकारी अधूरी है या उसे और जाँचने की ज़रूरत है। शुल्क तभी दिखता है जब पिछले लेन-देन का प्रमाण पूरा हो। जाँच पूरी होने तक साइन न करें।")}</p>}
        {!localized && <>
          <p className="accessible-warning">{t("Do not sign yet. Compare this file with your intended payment first.", "अभी साइन न करें। पहले फ़ाइल का अपने चाहे हुए भुगतान से मेल जाँचें।")}</p>
          <button type="button" className="button" onClick={onCompare}>{t("Tell us the payment you intended", "बताएँ कि आप क्या भुगतान चाहते हैं")}<ArrowRight aria-hidden="true" size={22} /></button>
        </>}
      </>}
      {localized && <section className="accessible-signing" aria-labelledby="accessible-signing-heading">
        <h3 id="accessible-signing-heading" tabIndex={-1}>{localized.title}</h3>
        <p className={matched ? "" : "accessible-warning"}>{localized.instruction}</p>
        <ul>{localized.details.map((detail, index) => <li key={index}>{detail}</li>)}</ul>
        <button type="button" className="button" disabled={quiet} onClick={() => onRead(narration)}>{t("Hear the complete review", "पूरी जाँच सुनें")}</button>
        {matched && <fieldset>
          <legend>{t("Before you decide to sign in your wallet", "वॉलेट में साइन का निर्णय लेने से पहले")}</legend>
          {checklist.map((label, index) => <label className="accessible-check" key={index}>
            <input type="checkbox" checked={items[index] ?? false} onChange={(event) => {
              const next = checklist.map((_, i) => i === index ? event.target.checked : items[i] ?? false);
              setAcknowledgements({ binding, items: next });
            }} />{label}
          </label>)}
          <p role="status">{understood ? t("You have acknowledged these details. Return to your wallet, compare this exact transaction, and make your own signing decision. A match is not a guarantee of safety.", "आपने विवरण समझने की पुष्टि की है। वॉलेट में इसी लेन-देन का मिलान करें और साइन का निर्णय खुद लें। मेल सुरक्षा की गारंटी नहीं है।") : t("Review all three points. Checking them does not sign or approve the transaction.", "तीनों बातें देखें। इन्हें चुनने से साइन या भुगतान की अनुमति नहीं होती।")}</p>
        </fieldset>}
      </section>}
      <details className="accessible-transcript"><summary>{t("Read the complete spoken explanation", "पूरा बोला गया विवरण पढ़ें")}</summary><p>{narration}</p></details>
    </section>
  );
}
