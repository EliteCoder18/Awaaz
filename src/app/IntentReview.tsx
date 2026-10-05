import { useState } from "react";
import { Check, ArrowRight, Volume2, CircleAlert } from "lucide-react";
import type { Locale, PaymentIntent, WalletProfile } from "../core/types";

export function IntentReview({
  draft,
  profile,
  locale,
  feeText,
  confirmed,
  onConfirm,
  onRead,
  quiet = false,
}: {
  draft: PaymentIntent;
  profile: WalletProfile;
  locale: Locale;
  feeText: string;
  confirmed: boolean;
  onConfirm: (script: string) => void;
  onRead: () => void;
  quiet?: boolean;
}) {
  const hi = locale === "hi-IN",
    t = (en: string, hin: string) => (hi ? hin : en),
    contact = profile.addressBook.find((c) => c.id === draft.recipientAlias);
  const [selected, setSelected] = useState(draft.expectedScriptHexes[0] ?? "");
  const [teach, setTeach] = useState(false),
    [answer, setAnswer] = useState(""),
    [recipient, setRecipient] = useState(""),
    [feedback, setFeedback] = useState("");
  const valid =
    draft.ambiguities.length === 0 &&
    profile.source !== undefined &&
    draft.amountSats !== undefined &&
    /^\d+$/.test(feeText);
  const ambiguityCopy: Record<string, string> = {
    MISSING_RECIPIENT: t(
      "Mention one configured recipient.",
      "कॉन्फ़िगर किए एक प्राप्तकर्ता का नाम बोलें।",
    ),
    AMBIGUOUS_RECIPIENT: t(
      "More than one recipient was mentioned.",
      "एक से अधिक प्राप्तकर्ताओं का नाम मिला।",
    ),
    MISSING_AMOUNT: t("Include an exact amount.", "सटीक राशि जोड़ें।"),
    MISSING_UNIT: t(
      "Use sats or BTC as the unit.",
      "राशि सैट्स या BTC में लिखें।",
    ),
    UNSUPPORTED_AMOUNT: t(
      "Use a positive amount with no fractional sats.",
      "सकारात्मक राशि लिखें, सैट्स में दशमलव नहीं।",
    ),
    MULTIPLE_AMOUNTS: t("Use one payment amount.", "एक ही भुगतान राशि लिखें।"),
    NEGATED_INSTRUCTION: t(
      "Rewrite your correction as one clear instruction.",
      "सुधार को एक स्पष्ट निर्देश में फिर लिखें।",
    ),
    UNSUPPORTED_LANGUAGE: t(
      "This phrase is outside the supported grammar. Edit it to a simple payment.",
      "यह वाक्य समर्थित व्याकरण में नहीं है। सरल भुगतान निर्देश लिखें।",
    ),
  };
  return (
    <div className={"intent-readback " + (confirmed ? "is-confirmed" : "")}>
      <div className="readback-label">
        <span>
          {confirmed ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Volume2 size={14} aria-hidden="true" />
          )}
          {confirmed
            ? t("Intent confirmed", "निर्देश की पुष्टि हुई")
            : t("Here’s what I understood", "मैंने यह समझा")}
        </span>
        <button
          type="button"
          className="text-button"
          onClick={onRead}
          disabled={quiet}
        >
          {t("Read aloud", "सुनाएँ")}
        </button>
      </div>
      <dl className="intent-facts">
        <div>
          <dt>{t("Recipient", "प्राप्तकर्ता")}</dt>
          <dd>{contact?.displayName ?? t("Unresolved", "अस्पष्ट")}</dd>
        </div>
        <div>
          <dt>{t("Amount", "राशि")}</dt>
          <dd>
            {draft.amountSats?.toLocaleString("en-IN") ?? "—"} <span>sats</span>
          </dd>
        </div>
        <div>
          <dt>{t("Maximum fee", "अधिकतम शुल्क")}</dt>
          <dd>
            {/^\d+$/.test(feeText)
              ? BigInt(feeText).toLocaleString("en-IN")
              : "—"}{" "}
            <span>sats</span>
          </dd>
        </div>
      </dl>
      {contact && (
        <div className="recipient-selection">
          <label htmlFor="selected-recipient">
            {t("Confirm recipient address", "प्राप्तकर्ता का पता पुष्टि करें")}
          </label>
          <select
            className="mono"
            id="selected-recipient"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {contact.scriptHexes.map((script) => (
              <option key={script} value={script}>
                {contact.address ?? script}
              </option>
            ))}
          </select>
        </div>
      )}
      {draft.ambiguities.length > 0 && (
        <div className="ambiguities" role="alert">
          <CircleAlert size={17} aria-hidden="true" />
          <ul>
            {draft.ambiguities.map((a) => (
              <li key={a.code}>{ambiguityCopy[a.code]}</li>
            ))}
          </ul>
        </div>
      )}
      {valid && !confirmed && (
        <>
          <label className="check-label optional">
            <input
              type="checkbox"
              checked={teach}
              onChange={(e) => {
                setTeach(e.target.checked);
                setFeedback("");
              }}
            />
            {t(
              "Help me double-check my understanding",
              "मेरी समझ दोबारा जाँचने में मदद करें",
            )}
          </label>
          {teach && (
            <div className="teach-back">
              <div className="two-fields">
                <div>
                  <label htmlFor="teach-recipient">
                    {t("Who receives the payment?", "भुगतान किसे मिलेगा?")}
                  </label>
                  <select
                    id="teach-recipient"
                    value={recipient}
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      setFeedback("");
                    }}
                  >
                    <option value="">{t("Choose", "चुनें")}</option>
                    {profile.addressBook.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="teach-amount">
                    {t("How many sats?", "कितने सैट्स?")}
                  </label>
                  <input
                    id="teach-amount"
                    inputMode="numeric"
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setFeedback("");
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setFeedback(
                    recipient === draft.recipientAlias &&
                      /^\d+$/.test(answer) &&
                      BigInt(answer) === draft.amountSats
                      ? t(
                          "Correct. Review the fee limit, then confirm.",
                          "सही। शुल्क सीमा जाँचकर पुष्टि करें।",
                        )
                      : t(
                          "Those answers differ. Review the instruction above.",
                          "उत्तर अलग हैं। ऊपर निर्देश फिर जाँचें।",
                        ),
                  )
                }
              >
                {t("Check my understanding", "मेरी समझ जाँचें")}
              </button>
              <p role="status">{feedback}</p>
            </div>
          )}
        </>
      )}
      {!confirmed && (
        <button
          className="button confirm-button"
          type="button"
          disabled={!valid}
          onClick={() => onConfirm(selected)}
        >
          {t("Confirm payment intent", "भुगतान निर्देश की पुष्टि करें")}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
