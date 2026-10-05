import {
  ArrowUpRight,
  AudioLines,
  ScanLine,
  MessageSquareText,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDeskMotion } from "./motion";
import type { Locale } from "../../core/types";
export function InfoPage({
  kind,
  locale,
}: {
  kind: "guide" | "developers";
  locale: Locale;
}) {
  const { reveal, interact } = useDeskMotion();
  const t = (en: string, hi: string) => (locale === "hi-IN" ? hi : en);
  return (
    <main id="site-main" className="site-info" tabIndex={-1}>
      <span className="section-kicker">
        {kind === "guide"
          ? t("THE AWAAZ FIELD GUIDE", "आवाज़ मार्गदर्शिका")
          : t("BUILT TO BE INTEGRATED", "इंटीग्रेशन के लिए बनाया गया")}
      </span>
      <h1 tabIndex={-1}>
        {kind === "guide" ? (
          <>
            {t("A second look.", "एक दूसरी नज़र।")}
            <br />
            <em>{t("Not a leap of faith.", "अंधा भरोसा नहीं।")}</em>
          </>
        ) : (
          <>
            {t("Better reviews.", "बेहतर भुगतान जाँच।")}
            <br />
            <em>{t("Beyond one interface.", "एक UI से आगे।")}</em>
          </>
        )}
      </h1>
      <p className="info-lead">
        {kind === "guide"
          ? t(
              "Awaaz compares the payment you confirmed with an unsigned Bitcoin transaction. Here’s what happens, and where its limits begin.",
              "आवाज़ आपके पुष्टि किए भुगतान का बिना साइन बिटकॉइन लेन-देन से मेल जाँचता है। जानें यह कैसे होता है और इसकी सीमाएँ क्या हैं।",
            )
          : t(
              "A UI-independent review engine for wallet builders. Deterministic facts, exact sats and bilingual reports—without taking custody of a single key.",
              "वॉलेट डेवलपर्स के लिए UI से स्वतंत्र जाँच इंजन। निश्चित नियम, सटीक सैट्स और दो भाषाओं में रिपोर्ट—कुंजी की कस्टडी लिए बिना।",
            )}
      </p>
      {kind === "guide" ? (
        <>
          <div className="guide-steps">
            {[
              {
                icon: AudioLines,
                title: t("Tell us what you mean", "अपनी मंशा बताएँ"),
                body: t(
                  "Say or type a recipient and exact sats/BTC amount. Review the address and your maximum fee, then explicitly confirm. Optional purpose adds context, not authority.",
                  "प्राप्तकर्ता और सटीक सैट्स/BTC राशि बोलें या लिखें। पता और अधिकतम शुल्क जाँचकर पुष्टि करें। कारण केवल संदर्भ देता है।",
                ),
              },
              {
                icon: ScanLine,
                title: t(
                  "Bring the actual transaction",
                  "असली लेन-देन डेटा लाएँ",
                ),
                body: t(
                  "Import an unsigned PSBT v0. Every input needs hash-linked previous transaction evidence. Change is only recognized by your configured scripts—not guessed from position.",
                  "बिना साइन PSBT v0 लाएँ। हर इनपुट को पिछले लेन-देन का हैश-जुड़ा प्रमाण चाहिए। चेंज केवल कॉन्फ़िगर की स्क्रिप्ट से पहचाना जाता है।",
                ),
              },
              {
                icon: MessageSquareText,
                title: t("Read, listen, ask", "पढ़ें, सुनें, पूछें"),
                body: t(
                  "Check recipient, payment, fee, debit and change. Ask in Hindi, English or Hinglish. Optional Gemini interprets wording the local router cannot understand; answers use checked local facts. Unsupported topics are declined. Signing stays in your wallet.",
                  "प्राप्तकर्ता, राशि, शुल्क, कुल बाहरी भुगतान और चेंज देखें। हिंदी, अंग्रेज़ी या हिंग्लिश में पूछें। वैकल्पिक Gemini स्थानीय रूप से न समझी शब्दावली समझता है; उत्तर जाँचे स्थानीय तथ्यों से आते हैं। असमर्थित विषयों पर उत्तर नहीं मिलते। साइन करना वॉलेट में रहता है।",
                ),
              },
            ].map((step, i) => (
              <motion.section key={i} {...reveal(i * 0.06)}>
                <span className="info-step-number">0{i + 1}</span>
                <step.icon size={25} aria-hidden="true" />
                <h2>{step.title}</h2>
                <p>{step.body}</p>
              </motion.section>
            ))}
          </div>
          <motion.section className="verdict-guide" {...reveal()}>
            <h2>
              {t(
                "Three results. No hidden meaning.",
                "तीन परिणाम। स्पष्ट अर्थ।",
              )}
            </h2>
            <dl>
              <div>
                <dt>MATCH</dt>
                <dd>
                  {t(
                    "Supported facts agree with your confirmed instruction and fee cap. Not proof of safety or identity.",
                    "समर्थित तथ्य पुष्टि किए निर्देश और शुल्क सीमा से मेल खाते हैं। सुरक्षा या पहचान का प्रमाण नहीं।",
                  )}
                </dd>
              </div>
              <div>
                <dt>MISMATCH</dt>
                <dd>
                  {t(
                    "An understood detail disagrees. Do not sign; correct the payment in your wallet.",
                    "कोई जाँचा विवरण मेल नहीं खाता। साइन न करें; वॉलेट में भुगतान ठीक करें।",
                  )}
                </dd>
              </div>
              <div>
                <dt>INCOMPLETE</dt>
                <dd>
                  {t(
                    "A fact is missing, ambiguous or unsupported. Do not sign; resolve it before another review.",
                    "कोई तथ्य अनुपलब्ध, अस्पष्ट या असमर्थित है। साइन न करें; पहले इसे स्पष्ट करें।",
                  )}
                </dd>
              </div>
            </dl>
          </motion.section>
          <motion.section className="honest-limits" {...reveal()}>
            <ShieldCheck size={26} aria-hidden="true" />
            <div>
              <h2>
                {t("What this tool cannot prove", "यह क्या सिद्ध नहीं कर सकता")}
              </h2>
              <p>
                {t(
                  "Recipient identity, address ownership, chain inclusion, unspentness, spendability or PSBT chain origin. Urgency prompts are rules, not fraud detection. Local hashes are unsigned records, not security certificates.",
                  "प्राप्तकर्ता की पहचान, पते का स्वामित्व, ब्लॉकचेन में शामिल होना, इनपुट का अभी खर्च न होना या PSBT की मूल चेन। जल्दबाज़ी के संकेत नियम हैं, धोखाधड़ी की पहचान नहीं। स्थानीय हैश सुरक्षा प्रमाणपत्र नहीं।",
                )}
              </p>
            </div>
          </motion.section>
          <motion.section className="info-privacy" {...reveal()}>
            <h2>
              {t("See it. Hear it. Your choice.", "देखें या सुनें। आपकी पसंद।")}
            </h2>
            <p>
              {t(
                "Simple view guides you through three steps with pictures and exact amounts. Sound off keeps every instruction and warning visible. Pictures are not sign language: support for people who cannot hear and cannot read still needs human-validated Indian Sign Language and testing with intended users.",
                "सरल दृश्य में चित्र और सटीक राशि के साथ तीन चरण हैं। आवाज़ बंद करने पर भी सारे निर्देश और चेतावनियाँ दिखती हैं। चित्र सांकेतिक भाषा नहीं हैं: जो सुन और पढ़ नहीं सकते, उनके लिए मानवीय रूप से जाँची भारतीय सांकेतिक भाषा और उपयोगकर्ता परीक्षण अभी ज़रूरी है।",
              )}
            </p>
          </motion.section>
          <motion.section className="info-privacy" {...reveal()}>
            <h2>
              {t("No account. No hidden upload.", "न खाता, न छुपा अपलोड।")}
            </h2>
            <p>
              {t(
                "Review data lives in this tab’s memory. Reload or reset removes it. Voice needs your consent and may use a browser service; typed review works without it. Fee estimates make a separate opt-in public request. No authentication is required.",
                "जाँच डेटा इसी टैब की मेमोरी में रहता है। रीलोड या रीसेट से मिटता है। आवाज़ आपकी सहमति से ब्राउज़र सेवा इस्तेमाल कर सकती है; लिखकर जाँच बिना इसके काम करती है। शुल्क अनुमान अलग वैकल्पिक सार्वजनिक अनुरोध है। लॉगिन आवश्यक नहीं।",
              )}
            </p>
          </motion.section>
        </>
      ) : (
        <>
          <motion.div className="developer-panel" {...reveal()}>
            <Code2 size={28} aria-hidden="true" />
            <h2>
              {t(
                "One core. Clear responsibilities.",
                "एक इंजन। स्पष्ट जिम्मेदारियाँ।",
              )}
            </h2>
            <div className="engine-pipeline">
              <span>Intent</span>
              <span>PSBT facts</span>
              <span>Verification</span>
              <span>Localized report</span>
            </div>
            <pre>
              <code>{`const result = await runReview({\n  intent, profile, psbtBytes, evidence,\n  sessionId: 1, revision: 1\n});\n\nconst report = presentReport(\n  result.receipt.report, 'hi-IN'\n);`}</code>
            </pre>
            <p>
              {t(
                "Confirm intent explicitly first. Never derive confirmation from speech confidence, a QR label or a model response.",
                "पहले निर्देश की स्पष्ट पुष्टि लें। आवाज़ के कॉन्फ़िडेंस, QR नाम या मॉडल उत्तर को पुष्टि न मानें।",
              )}
            </p>
          </motion.div>
          <div className="developer-details">
            <motion.section {...reveal()}>
              <h2>{t("What’s available", "क्या उपलब्ध है")}</h2>
              <p>
                {t(
                  "Locally built ESM engine, TypeScript declarations, bigint accounting, bounded parsing, script comparison, contextual prompts and SHA-256 review bindings. No React, wallet or network adapters in the SDK.",
                  "स्थानीय ESM इंजन, TypeScript टाइप, bigint गणना, सीमित पार्सिंग, स्क्रिप्ट तुलना, संदर्भ संकेत और SHA-256 जाँच हैश। SDK में React, वॉलेट या नेटवर्क अडैप्टर नहीं।",
                )}
              </p>
              <pre>
                <code>npm run build:sdk{"\n"}npm run test:sdk</code>
              </pre>
            </motion.section>
            <motion.section {...reveal()}>
              <h2>
                {t("What an integrator owns", "इंटीग्रेटर की जिम्मेदारियाँ")}
              </h2>
              <p>
                {t(
                  "Consent, explicit confirmation, frozen snapshots, stale-result rejection, worker timeouts and independent identity/change checks. Preserve DO NOT SIGN warnings. This is an experimental testnet engine, not an audited mainnet SDK.",
                  "सहमति, स्पष्ट पुष्टि, स्थिर स्नैपशॉट, पुराने परिणाम का अस्वीकार, टाइमआउट और स्वतंत्र पहचान/चेंज जाँच। साइन न करें चेतावनी बनाए रखें। यह प्रयोगात्मक टेस्टनेट इंजन है, ऑडिट किया मेननेट SDK नहीं।",
                )}
              </p>
            </motion.section>
          </div>
          <motion.section className="honest-limits" {...reveal()}>
            <ShieldCheck size={26} aria-hidden="true" />
            <div>
              <h2>
                {t(
                  "Integration first. Claims second.",
                  "पहले इंटीग्रेशन। फिर दावे।",
                )}
              </h2>
              <p>
                {t(
                  "The proposed model is a free companion with future licensed integration/support. No billing, accounts, authentication or wallet partnership is implemented. Package is local and unpublished.",
                  "प्रस्तावित मॉडल मुफ़्त जाँच ऐप और भविष्य में लाइसेंस/इंटीग्रेशन सहायता है। बिलिंग, खाते, लॉगिन या वॉलेट साझेदारी लागू नहीं। पैकेज स्थानीय और अप्रकाशित है।",
                )}
              </p>
            </div>
          </motion.section>
        </>
      )}
      <motion.section className="info-privacy" {...reveal()}>
        <h2>{t("AI for understanding. Exact rules for Bitcoin.", "समझने के लिए AI। बिटकॉइन के लिए सटीक नियम।")}</h2>
        <p>
          {t(
            "Start a conversation as soon as your unsigned file is readable. Optional OpenAI understands compound questions and follow-ups using the current question, previous question, topic labels and language. Gemini remains a single-question fallback. Neither provider receives your transaction as attached context or generates financial numbers. Local facts explain the payment; separate opt-in mempool estimates support fee comparisons and confirmation-priority estimates. Final signature size and network conditions can change the estimates. Confirm intent separately before comparing it with the file.",
            "बिना साइन वाली फ़ाइल पढ़ते ही संवाद शुरू करें। वैकल्पिक OpenAI मौजूदा प्रश्न, पिछला प्रश्न, विषय और भाषा से कई हिस्सों वाले और अगले प्रश्न समझता है। Gemini एक प्रश्न की मदद देता है। दोनों को लेन-देन संदर्भ में साथ नहीं भेजते और AI वित्तीय राशि नहीं बनाता। स्थानीय तथ्य भुगतान समझाते हैं; अलग सहमति वाले mempool अनुमान शुल्क तुलना और पुष्टि की प्राथमिकता बताते हैं। अंतिम हस्ताक्षर का आकार और नेटवर्क स्थिति अनुमान बदल सकते हैं। फ़ाइल से मेल जाँचने से पहले निर्देश अलग से पुष्टि करें।",
          )}
        </p>
      </motion.section>
      <div className="info-next">
        <p>
          {t(
            "Ready to put your words next to the facts?",
            "अपनी मंशा का तथ्यों से मेल जाँचने के लिए तैयार?",
          )}
        </p>
        <motion.a className="site-action" href="/review" {...interact}>
          {t("Open the review desk", "भुगतान जाँच खोलें")}
          <ArrowUpRight size={20} aria-hidden="true" />
        </motion.a>
      </div>
    </main>
  );
}
