import { useEffect, useRef, useState } from "react";
import {
  fetchFeeContext,
  isFeeContextFresh,
  type FeeContext,
} from "../adapters/feeContext";
import type { Locale } from "../core/types";
export function NetworkContext({ locale }: { locale: Locale }) {
  const t = (en: string, hi: string) => (locale === "hi-IN" ? hi : en);
  const [data, setData] = useState<FeeContext>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now());
  const op = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 10000);
    return () => {
      clearInterval(tick);
      op.current?.abort();
    };
  }, []);
  async function load() {
    op.current?.abort();
    const controller = new AbortController();
    op.current = controller;
    setBusy(true);
    setError("");
    setData(undefined);
    try {
      const value = await fetchFeeContext(controller.signal);
      if (!controller.signal.aborted) {
        setData(value);
        setNow(Date.now());
      }
    } catch {
      if (!controller.signal.aborted)
        setError(
          t(
            "Public fee estimates are unavailable. Your transaction checks and fee limit are unchanged.",
            "सार्वजनिक शुल्क अनुमान उपलब्ध नहीं हैं। लेन-देन जाँच और शुल्क सीमा नहीं बदली है।",
          ),
        );
    } finally {
      if (op.current === controller) {
        op.current = undefined;
        setBusy(false);
      }
    }
  }
  return (
    <section
      className="network-context"
      aria-labelledby="network-context-heading"
    >
      <div className="network-context-heading">
        <span className="eyebrow">
          {t("NETWORK / OPTIONAL", "नेटवर्क / वैकल्पिक")}
        </span>
        <h3 id="network-context-heading">
          {t("A little network perspective.", "नेटवर्क का थोड़ा संदर्भ।")}
        </h3>
      </div>
      <p>
        {t(
          "Only public fee estimates are requested. No transaction, address, transcript or reason is sent. Estimates use testnet3; your PSBT’s chain origin is not detectable.",
          "केवल सार्वजनिक शुल्क अनुमान मँगाए जाते हैं। लेन-देन, पता, निर्देश या कारण नहीं भेजे जाते। अनुमान testnet3 के हैं; PSBT का वास्तविक नेटवर्क पता नहीं चलता।",
        )}
      </p>
      <button
        className="button secondary small"
        type="button"
        disabled={busy}
        onClick={() => void load()}
      >
        {busy
          ? t("Loading estimates…", "अनुमान लोड हो रहे हैं…")
          : data
            ? t("Refresh fee estimates", "शुल्क अनुमान फिर लें")
            : t("Load public fee estimates", "सार्वजनिक शुल्क अनुमान लें")}
      </button>
      {data && (
        <>
          <dl className="fee-estimates">
            <div>
              <dt>{t("Fastest", "तेज़")}</dt>
              <dd>{data.fastestFee} sat/vB</dd>
            </div>
            <div>
              <dt>{t("About an hour", "लगभग एक घंटा")}</dt>
              <dd>{data.hourFee} sat/vB</dd>
            </div>
          </dl>
          <p className="fee-provenance">
            {isFeeContextFresh(data, now)
              ? t("Retrieved", "प्राप्त")
              : t(
                  "STALE — refresh before using",
                  "पुराना — इस्तेमाल से पहले फिर लें",
                )}{" "}
            {new Date(data.fetchedAt).toLocaleTimeString(locale)} · testnet3 ·{" "}
            <a href={data.source} target="_blank" rel="noreferrer">
              mempool.space
            </a>
          </p>
        </>
      )}
      {error && (
        <p role="status" className="inline-error">
          {error}
        </p>
      )}
      <p className="context-boundary">
        {t(
          "Informational only. We do not infer an exact unsigned fee rate or alter your confirmed sats limit.",
          "केवल जानकारी। बिना साइन लेन-देन की सटीक शुल्क दर नहीं निकाली जाती और आपकी सैट्स सीमा नहीं बदली जाती।",
        )}
      </p>
    </section>
  );
}
