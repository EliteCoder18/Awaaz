import { useEffect, useState } from "react";
import { Check, Settings2 } from "lucide-react";
import { createWalletProfile } from "../core/walletProfile";
import { DEMO_WALLET_PROFILE } from "../demo/fixtures";
import type { Locale, WalletProfile } from "../core/types";
import { QrImport } from "./QrImport";

export function WalletProfileEditor({
  profile,
  locale,
  onDirty,
  onApply,
  active = true,
  interactionEpoch = 0,
}: {
  profile: WalletProfile;
  locale: Locale;
  onDirty: () => void;
  onApply: (p: WalletProfile) => void;
  active?: boolean;
  interactionEpoch?: number;
}) {
  const hi = locale === "hi-IN",
    t = (en: string, hin: string) => (hi ? hin : en);
  const first = profile.addressBook[0];
  const [name, setName] = useState(first?.displayName ?? ""),
    [aliases, setAliases] = useState(first?.aliases.join(", ") ?? ""),
    [recipient, setRecipient] = useState(first?.address ?? ""),
    [change, setChange] = useState(profile.changeAddresses?.join("\n") ?? "");
  const [checked, setChecked] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const c = profile.addressBook[0];
    setName(c?.displayName ?? "");
    setAliases(c?.aliases.join(", ") ?? "");
    setRecipient(c?.address ?? "");
    setChange(profile.changeAddresses?.join("\n") ?? "");
    setChecked(false);
  }, [profile]);
  function dirty() {
    onDirty();
    setChecked(false);
    setError("");
  }
  return (
    <details className="profile-settings">
      <summary>
        <Settings2 size={16} aria-hidden="true" />
        {t("Recipient & change addresses", "प्राप्तकर्ता और चेंज के पते")}
        <span className="source-tag">
          {profile.source === "demo"
            ? t("Demo profile", "डेमो प्रोफ़ाइल")
            : t("Your profile", "आपकी प्रोफ़ाइल")}
        </span>
      </summary>
      <div className="settings-body">
        <p className="muted">
          {t(
            "Set these independently of the transaction you import. Only public testnet addresses belong here.",
            "इन्हें आयात किए लेन-देन से अलग जाँचें। यहाँ केवल सार्वजनिक टेस्टनेट पते डालें।",
          )}
        </p>
        <QrImport
          active={active}
          interactionEpoch={interactionEpoch}
          locale={locale}
          mode="request"
          onRequest={(request) => {
            dirty();
            setRecipient(request.address);
            if (request.label) {
              setName(request.label);
              setAliases(request.label);
            }
          }}
        />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!checked) return;
            try {
              onApply(
                createWalletProfile({
                  recipients: [
                    {
                      id: "recipient",
                      name,
                      aliases: aliases
                        .split(",")
                        .map((a) => a.trim())
                        .filter(Boolean),
                      address: recipient,
                    },
                  ],
                  changeAddresses: change.split(/\s+/).filter(Boolean),
                  source: "user-reviewed",
                  revision: (profile.revision ?? 0) + 1,
                }),
              );
              setError("");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Invalid addresses.");
            }
          }}
        >
          <div className="two-fields">
            <div>
              <label htmlFor="contact-name">
                {t("Recipient name", "प्राप्तकर्ता का नाम")}
              </label>
              <input
                id="contact-name"
                value={name}
                onChange={(e) => {
                  dirty();
                  setName(e.target.value);
                }}
                maxLength={60}
                required
              />
            </div>
            <div>
              <label htmlFor="contact-aliases">
                {t(
                  "Spoken names, comma separated",
                  "बोले जाने वाले नाम, कॉमा से अलग",
                )}
              </label>
              <input
                id="contact-aliases"
                value={aliases}
                onChange={(e) => {
                  dirty();
                  setAliases(e.target.value);
                }}
                required
              />
            </div>
          </div>
          <label htmlFor="recipient-address">
            {t("Recipient testnet address", "प्राप्तकर्ता का टेस्टनेट पता")}
          </label>
          <input
            className="mono"
            id="recipient-address"
            value={recipient}
            onChange={(e) => {
              dirty();
              setRecipient(e.target.value);
            }}
            spellCheck={false}
            autoComplete="off"
            required
          />
          <label htmlFor="change-addresses">
            {t(
              "Allowed change addresses, one per line",
              "स्वीकृत चेंज पते, एक पंक्ति में एक",
            )}
          </label>
          <textarea
            className="mono"
            id="change-addresses"
            value={change}
            onChange={(e) => {
              dirty();
              setChange(e.target.value);
            }}
            rows={2}
            spellCheck={false}
          />
          <label className="check-label">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              required
            />
            {t(
              "I independently checked these recipient and change addresses.",
              "मैंने प्राप्तकर्ता और चेंज के पते स्वतंत्र रूप से जाँचे हैं।",
            )}
          </label>
          {error && (
            <p role="alert" className="inline-error">
              {error}
            </p>
          )}
          <div className="button-row">
            <button className="button small" type="submit" disabled={!checked}>
              <Check size={16} aria-hidden="true" />
              {t("Save reviewed addresses", "जाँचे गए पते सहेजें")}
            </button>
            <button
              className="button ghost small"
              type="button"
              onClick={() =>
                onApply({
                  ...DEMO_WALLET_PROFILE,
                  revision: (profile.revision ?? 0) + 1,
                })
              }
            >
              {t("Restore demo addresses", "डेमो पते वापस लाएँ")}
            </button>
          </div>
        </form>
        <p className="fine-print">
          {t(
            "Awaaz checks against these addresses. Entering an address does not prove its owner's identity or ownership.",
            "आवाज़ इन पतों से तुलना करता है। पता डालने से मालिक की पहचान या स्वामित्व सिद्ध नहीं होता।",
          )}
        </p>
      </div>
    </details>
  );
}
