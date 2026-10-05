import {
  ArrowUpRight,
  AudioLines,
  FileCheck2,
  ScanLine,
  Check,
  Minus,
  BookOpen,
  Fingerprint,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useDeskMotion } from "./motion";
import type { Locale } from "../../core/types";
import type { SessionOverview } from "./session";
function VoiceLedger({ locale }: { locale: Locale }) {
  const hi = locale === "hi-IN";
  const t = (en: string, hindi: string) => hi ? hindi : en;
  const { reduced } = useDeskMotion();
  const [inView, setInView] = useState(false);
  return (
    <div className="voice-ledger" aria-hidden="true">
      <span className="ledger-corner">आ / ₿</span>
      <motion.div
        className="voice-rings"
        initial={{ y: 0 }}
        animate={{ y: reduced || !inView ? 0 : [0, -6, 0] }}
        onViewportEnter={() => setInView(true)}
        onViewportLeave={() => setInView(false)}
        viewport={{ amount: 0.5 }}
        transition={{
          duration: reduced ? 0 : inView ? 5 : 0.3,
          repeat: reduced || !inView ? 0 : Infinity,
          ease: "easeInOut",
        }}
      >
        <div />
        <div />
        <div />
        <AudioLines size={72} strokeWidth={1.3} />
      </motion.div>
      <div className="ledger-dash" />
      <div className="ledger-receipt">
        <span>{t("UNSIGNED PSBT / DEMO", "बिना साइन की PSBT / उदाहरण")}</span>
        <strong>
          50,000 <small>{t("sats", "सैट्स")}</small>
        </strong>
        <div>
          <span>{t("TO", "इनको")}</span>
          <b>Riya</b>
        </div>
        <div>
          <span>{t("FEE", "शुल्क")}</span>
          <b>1,000 {t("sats", "सैट्स")}</b>
        </div>
        <p>{t("YOUR WORDS ↔ THE FACTS", "आपकी बात ↔ असली हिसाब")}</p>
      </div>
      <span className="ledger-caption" lang={hi ? "hi" : "en"}>
        {t("File → Simple explanation → Review", "फ़ाइल → आसान हिंदी → जाँच")}
      </span>
    </div>
  );
}
export function Dashboard({
  overview,
  locale,
}: {
  overview: SessionOverview;
  locale: Locale;
}) {
  const { reveal, interact } = useDeskMotion();
  const hi = locale === "hi-IN",
    t = (en: string, h: string) => (hi ? h : en);
  const readiness = [
    {
      label: t("Payment intent", "भुगतान निर्देश"),
      ready: overview.hasIntent,
      value: overview.hasIntent
        ? t("Confirmed", "पुष्टि हुई")
        : t("Not confirmed", "पुष्टि बाकी"),
    },
    {
      label: t("Transaction", "लेन-देन"),
      ready: overview.hasTransaction,
      value: overview.hasTransaction
        ? t("Loaded", "लोड हो गया")
        : t("Not loaded", "लोड नहीं हुआ"),
    },
    {
      label: t("Current review", "वर्तमान जाँच"),
      ready: !!overview.verdict,
      value: overview.verdict ?? t("Not reviewed", "जाँच बाकी"),
    },
  ];
  return (
    <main id="site-main" className="dashboard-page" tabIndex={-1}>
      <motion.div className="page-intro" {...reveal()}>
        <div>
          <span className="section-kicker">
            {t("YOUR PERSONAL REVIEW DESK", "आपकी स्वतंत्र भुगतान जाँच")}
          </span>
          <h1 tabIndex={-1}>
            {t("Understand your payment.", "अपना भुगतान समझें।")}
            <br />
            <em>{t("Before you sign.", "साइन करने से पहले।")}</em>
          </h1>
          <p>
            {t(
              "A Bitcoin review companion with optional AI question understanding. Ask in Hindi, English or Hinglish; read or hear answers grounded in your unsigned transaction before signing.",
              "वैकल्पिक AI प्रश्न समझ के साथ बिटकॉइन जाँच साथी। हिंदी, अंग्रेज़ी या हिंग्लिश में पूछें; साइन करने से पहले बिना साइन लेन-देन पर आधारित उत्तर पढ़ें या सुनें।",
            )}
          </p>
        </div>
        <div className="intro-note">
          <span>01 / AWAAZ</span>
          <p lang="hi">
            आपकी बात।
            <br />
            असली हिसाब।
          </p>
        </div>
      </motion.div>
      <motion.section
        className="dashboard-feature"
        aria-labelledby="feature-title"
        {...reveal(0.06)}
      >
        <div className="feature-copy">
          <span className="feature-label">
            <span />
            {t("AN INDEPENDENT SECOND LOOK", "एक स्वतंत्र दूसरी नज़र")}
          </span>
          <h2 id="feature-title">
            {t("Show your file.", "अपनी फ़ाइल दिखाएँ।")}
            <br />
            <em>{t("Understand your payment.", "भुगतान समझें।")}</em>
          </h2>
          <p>
            {t(
              "Bring the unsigned PSBT from your wallet and ask what it does, whether the fee is high, or how long confirmation might take. Optional OpenAI understands follow-ups; local facts and opt-in mempool estimates supply the answers. Then compare the file with your intended payment.",
              "वॉलेट की बिना साइन वाली PSBT लाएँ और पूछें: यह क्या करेगी, शुल्क ज़्यादा है या पुष्टि कब हो सकती है? वैकल्पिक OpenAI अगले प्रश्न समझता है; स्थानीय तथ्य और सहमति वाले mempool अनुमान उत्तर देते हैं। फिर अपने चाहे हुए भुगतान से फ़ाइल का मेल जाँचें।",
            )}
          </p>
          <div className="feature-actions">
            <motion.a
              className="site-action saffron"
              href="/review"
              {...interact}
            >
              {t("Review a payment", "भुगतान की जाँच करें")}
              <ArrowUpRight size={20} aria-hidden="true" />
            </motion.a>
            <motion.a className="demo-link" href="/review?demo=1" {...interact}>
              {t("Try the guided demo", "डेमो आज़माएँ")}
              <ArrowRight size={16} aria-hidden="true" />
            </motion.a>
          </div>
          <small>
            {t(
              "No keys. No signing. No account. Synthetic demo, no funds.",
              "न कुंजी, न साइन, न खाता। डेमो में असली धन नहीं।",
            )}
          </small>
          <small className="demo-replacement-note">
            {t(
              "Guided demo starts a fresh synthetic session and replaces current desk inputs.",
              "डेमो नया कृत्रिम सत्र शुरू करता है और जाँच में मौजूद जानकारी बदल देता है।",
            )}
          </small>
        </div>
        <VoiceLedger locale={locale} />
      </motion.section>
      <motion.section
        className="readiness-section"
        aria-labelledby="readiness-title"
        {...reveal()}
      >
        <div className="section-heading">
          <h2 id="readiness-title">
            {t("On your desk", "आपकी जाँच की स्थिति")}
          </h2>
          <span>
            {t("LIVE SESSION · NOT SAVED", "वर्तमान सत्र · सहेजा नहीं गया")}
          </span>
        </div>
        <div className="readiness-grid" aria-label="Session readiness">
          {readiness.map((r, i) => (
            <div className="readiness-item" key={i}>
              <span className="readiness-icon">
                {r.ready ? (
                  <Check size={19} aria-hidden="true" />
                ) : (
                  <Minus size={19} aria-hidden="true" />
                )}
              </span>
              <div>
                <span>{r.label}</span>
                <strong>{r.value}</strong>
              </div>
              <span className="readiness-index">0{i + 1}</span>
            </div>
          ))}
        </div>
        <p>
          {t(
            "Only the current session is shown. Reset or reload clears it. MATCH means consistency, not proven safety.",
            "केवल वर्तमान सत्र दिखता है। रीसेट या रीलोड से डेटा मिटता है। MATCH मेल है, सुरक्षा का प्रमाण नहीं।",
          )}
        </p>
      </motion.section>
      <div className="dashboard-bottom">
        <motion.section className="preparation" {...reveal()}>
          <div className="section-heading">
            <h2>{t("A little preparation.", "थोड़ी तैयारी।")}</h2>
            <span>BEFORE YOU BEGIN</span>
          </div>
          <ol>
            {[
              {
                icon: Fingerprint,
                title: t(
                  "Check who you’re paying",
                  "पहचान स्वतंत्र रूप से जाँचें",
                ),
                text: t(
                  "Know the recipient address through a separate trusted channel. A name in a QR isn’t proof.",
                  "प्राप्तकर्ता का पता अलग भरोसेमंद माध्यम से जाँचें। QR में नाम पहचान का प्रमाण नहीं।",
                ),
              },
              {
                icon: FileCheck2,
                title: t("Bring an unsigned PSBT", "बिना साइन का PSBT लाएँ"),
                text: t(
                  "A file, Base64 text or a clear single-frame QR. Never a seed phrase or private key.",
                  "फ़ाइल, Base64 टेक्स्ट या एक फ़्रेम का QR। सीड या निजी कुंजी कभी नहीं।",
                ),
              },
              {
                icon: AudioLines,
                title: t("Use your own words", "अपनी भाषा में कहें"),
                text: t(
                  "Hindi, English or supported Hinglish. No microphone? Typing works just as well.",
                  "हिंदी, अंग्रेज़ी या समर्थित हिंग्लिश। माइक्रोफ़ोन नहीं? लिखना भी काम करता है।",
                ),
              },
            ].map((item, i) => (
              <li key={i}>
                <item.icon size={20} aria-hidden="true" />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.section>
        <motion.section className="guide-card" {...reveal(0.08)} {...interact}>
          <BookOpen size={27} aria-hidden="true" />
          <span className="section-kicker">
            {t("KNOW WHAT YOU’RE CHECKING", "जाँच को समझें")}
          </span>
          <h2>
            {t("Clarity is a feature.", "स्पष्टता भी एक सुविधा है।")}
            <br />
            <em>{t("So are honest limits.", "स्पष्ट सीमाएँ भी।")}</em>
          </h2>
          <p>
            {t(
              "What a PSBT says. What a match means. What Awaaz can’t prove. A short guide, without the jargon.",
              "PSBT क्या बताता है? MATCH का क्या अर्थ है? आवाज़ क्या सिद्ध नहीं कर सकता? सरल भाषा में एक मार्गदर्शिका।",
            )}
          </p>
          <a href="/guide">
            {t("Read the field guide", "मार्गदर्शिका पढ़ें")}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </motion.section>
      </div>
      <motion.div className="dashboard-signoff" {...reveal()}>
        <ScanLine size={18} aria-hidden="true" />
        <p>
          {t(
            "Not a wallet. Not a prediction. A clearer conversation with your transaction.",
            "न वॉलेट, न भविष्यवाणी। अपने लेन-देन के साथ एक स्पष्ट संवाद।",
          )}
        </p>
      </motion.div>
    </main>
  );
}
