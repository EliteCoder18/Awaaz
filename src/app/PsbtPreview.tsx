import { useMemo } from "react";
import {
  ArrowDown,
  FileCheck2,
  UserRound,
  Undo2,
  Network,
  Volume2,
  OctagonAlert,
} from "lucide-react";
import { parsePsbt } from "../core/psbtParser";
import type { Locale, PrevoutEvidence, WalletProfile } from "../core/types";

export function PsbtPreview({
  bytes,
  profile,
  evidence,
  quiet,
  locale = "en-IN",
  onRead,
}: {
  bytes: Uint8Array;
  profile: WalletProfile;
  evidence: PrevoutEvidence;
  quiet: boolean;
  locale?: Locale;
  onRead: (text: string) => void;
}) {
  const hi = locale === "hi-IN";
  const t = (en: string, hindi: string) => hi ? hindi : en;
  const unit = t("sats", "सैट्स");
  const parsed = useMemo(() => {
    try {
      return { facts: parsePsbt(bytes, profile, evidence) };
    } catch {
      return { facts: undefined };
    }
  }, [bytes, profile, evidence]);
  const facts = parsed.facts;
  if (
    !facts ||
    facts.warnings.some((w) => w.code === "UNSUPPORTED_PSBT_VERSION")
  )
    return (
      <div className="psbt-preview-error" role="alert" lang={hi ? "hi" : "en"}>
        <OctagonAlert size={24} aria-hidden="true" />
        <div>
          <strong>{t("This file could not be read. Do not sign.", "यह फ़ाइल पढ़ी नहीं जा सकी। साइन न करें।")}</strong>
          <p>
            {t("Get an unsigned PSBT v0 file from your wallet. Signed or incomplete files cannot be read here.", "वॉलेट से बिना साइन की PSBT v0 फ़ाइल लें। साइन की हुई या अधूरी फ़ाइल यहाँ नहीं पढ़ी जाती।")}
          </p>
        </div>
      </div>
    );
  const fmt = (value: bigint) => value.toLocaleString("en-IN");
  const fee = facts.evidenceComplete ? facts.feeSats : undefined;
  const outputs = facts.outputs.map((output) => {
    const contact = profile.addressBook.find((c) =>
      c.scriptHexes.includes(output.scriptHex),
    );
    const change = output.classification === "change";
    const title = change
      ? t("Remaining Bitcoin", "बचा हुआ बिटकॉइन")
      : output.classification === "op_return"
        ? t("Data output", "डेटा वाला हिस्सा")
        : contact
          ? t(`To ${contact.displayName}'s address`, `${contact.displayName} के पते पर`)
          : t("To another address", "एक दूसरे पते पर");
    return { ...output, title, change };
  });
  const spokenOutputs = outputs.map((o) => `${o.title}: ${fmt(o.valueSats)} ${unit}`).join(hi ? "। " : ". ");
  const spokenFee = fee === undefined ? t("Unknown", "पता नहीं चल पाया") : `${fmt(fee)} ${unit}`;
  const speech = t(`This file contains the following. ${spokenOutputs}. Network fee: ${spokenFee}. This has not been compared with your instruction yet. Do not sign.`, `इस फ़ाइल में ${spokenOutputs}। नेटवर्क का शुल्क ${spokenFee}। अभी आपके निर्देश से मेल नहीं जाँचा गया। साइन न करें।`);
  return (
    <section className="psbt-preview" aria-label={t("Simple file explanation", "फ़ाइल का सरल हिसाब")} lang={hi ? "hi" : "en"}>
      <div className="psbt-preview-heading">
        <FileCheck2 size={24} aria-hidden="true" />
        <div>
          <h3>{t("What does this file say?", "इस फ़ाइल में क्या लिखा है?")}</h3>
          <p>{t("The file has been read. No money is sent here.", "फ़ाइल पढ़ ली गई है। यहाँ पैसे नहीं भेजे जाते।")}</p>
        </div>
      </div>
      <div className="money-flow" aria-label={t("Where the Bitcoin will go", "बिटकॉइन कहाँ जाएगा")}>
        <div className="money-source">
          {t("Payment file from your wallet", "वॉलेट की बनाई भुगतान फ़ाइल")} <span>{t("Unsigned PSBT", "बिना साइन की PSBT")}</span>
        </div>
        <ArrowDown size={24} className="money-arrow" aria-hidden="true" />
        <div className="money-destinations">
          {outputs.map((output) => {
            const Icon = output.change ? Undo2 : UserRound;
            return (
              <article
                className={
                  "money-destination " + (output.change ? "is-change" : "")
                }
                key={output.index}
              >
                <Icon size={25} aria-hidden="true" />
                <h4>{output.title}</h4>
                <strong>
                  {fmt(output.valueSats)} <small>{unit}</small>
                </strong>
                <p>
                  {output.change
                    ? t("This address matches the change address you configured. Ownership has not been proven.", "यह पता आपके बताए बचा हुआ पैसा रखने के पते से मिलता है। इसका मालिक कौन है, यह साबित नहीं हुआ है।")
                    : output.classification === "unknown"
                      ? t("This address is not in your address book. Independently check who owns it.", "यह पता आपकी सूची में नहीं है। यह किसका पता है, अलग से जाँचें।")
                      : output.classification === "op_return"
                        ? t("This output contains data. It is not a payment to a person.", "यह डेटा वाला हिस्सा है। यह किसी व्यक्ति को भुगतान नहीं है।")
                        : t("The name comes from your address book. Independently check the recipient's address.", "नाम आपकी पता सूची से आया है। पैसे पाने वाले व्यक्ति का पता अलग से जाँचें।")}
                </p>
                <details>
                  <summary>{t("See the full address", "पूरा पता देखें")}</summary>
                  <code>{output.displayAddress ?? output.scriptHex}</code>
                </details>
              </article>
            );
          })}
          <article
            className="money-destination is-fee"
            aria-label={t("Network fee", "नेटवर्क का शुल्क")}
          >
            <Network size={25} aria-hidden="true" />
            <h4>{t("Network fee", "नेटवर्क का शुल्क")}</h4>
            <strong>
              {fee === undefined ? t("Unknown", "पता नहीं चल पाया") : fmt(fee)}
              {fee !== undefined && <small> {unit}</small>}
            </strong>
            <p>
              {t("The fee for processing the payment. It does not go to the recipient.", "भुगतान पहुँचाने का शुल्क। यह पैसे पाने वाले व्यक्ति को नहीं जाता।")}
            </p>
          </article>
        </div>
      </div>
      <p className="psbt-unit-note">
        {t("Sats are small units of Bitcoin. These amounts are not rupees.", "सैट्स बिटकॉइन की छोटी इकाई है। यह रुपये की राशि नहीं है।")}
      </p>
      <div className="psbt-preview-notice">
        <OctagonAlert size={22} aria-hidden="true" />
        <p>
          {t("This has not been compared with your instruction yet. Do not sign.", "अभी आपके निर्देश से मेल नहीं जाँचा गया। साइन न करें।")}
          {facts.warnings.length > 0 &&
            t(" Some information is missing or cannot be fully checked by this app.", " फ़ाइल में कुछ जानकारी अधूरी या ऐसी है जिसे यह ऐप पूरी तरह नहीं जाँच सकता।")}
        </p>
      </div>
      <button
        className="button secondary"
        type="button"
        disabled={quiet}
        onClick={() => onRead(speech)}
      >
        <Volume2 size={20} aria-hidden="true" />
        {t("Hear this explanation in English", "यह हिसाब हिंदी में सुनें")}
      </button>
    </section>
  );
}
