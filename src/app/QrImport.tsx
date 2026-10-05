import { useEffect, useRef, useState } from "react";
import { QrCode, ArrowUpRight } from "lucide-react";
import { decodeQrImage } from "../adapters/qrImage";
import {
  parsePaymentRequest,
  type PaymentRequest,
} from "../core/paymentRequest";
import type { Locale } from "../core/types";
export function QrImport({
  locale,
  mode,
  onRequest,
  onTransaction,
  onBegin,
  active = true,
  interactionEpoch = 0,
}: {
  locale: Locale;
  mode: "request" | "transaction";
  onRequest?: (r: PaymentRequest) => void;
  onTransaction?: (text: string) => void;
  onBegin?: () => AbortSignal | void;
  active?: boolean;
  interactionEpoch?: number;
}) {
  const t = (en: string, hi: string) => (locale === "hi-IN" ? hi : en);
  const [text, setText] = useState(""),
    [request, setRequest] = useState<PaymentRequest>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const op = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => op.current?.abort(), []);
  useEffect(() => {
    op.current?.abort();
    op.current = undefined;
    setBusy(false);
  }, [active, interactionEpoch]);
  function accept(value: string) {
    setError("");
    if (mode === "request") setRequest(parsePaymentRequest(value));
    else {
      if (!/^cHNidP/i.test(value.trim()))
        throw new Error(
          t(
            "Only single-frame Base64 PSBT QR data is supported. Animated UR/BBQR is not supported.",
            "केवल एक फ़्रेम का Base64 PSBT QR समर्थित है। एनिमेटेड UR/BBQR नहीं।",
          ),
        );
      onTransaction?.(value.trim());
    }
  }
  async function image(file: File | undefined) {
    if (!file) return;
    const parentSignal = onBegin?.();
    op.current?.abort();
    const controller = new AbortController();
    op.current = controller;
    const cancel = () => {
      controller.abort();
      setBusy(false);
    };
    parentSignal?.addEventListener("abort", cancel, { once: true });
    if (parentSignal?.aborted) cancel();
    setBusy(true);
    setRequest(undefined);
    setError("");
    try {
      const value = await decodeQrImage(file, controller.signal);
      if (!controller.signal.aborted) {
        setText(value);
        accept(value);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : "QR unavailable.");
    } finally {
      parentSignal?.removeEventListener("abort", cancel);
      if (op.current === controller) {
        op.current = undefined;
        setBusy(false);
      }
    }
  }
  return (
    <div className={"qr-import qr-" + mode}>
      <div className="qr-import-title">
        <QrCode size={18} aria-hidden="true" />
        <strong>
          {mode === "request"
            ? t("Bring a payment request", "भुगतान अनुरोध लाएँ")
            : t("Or bring a transaction QR", "या लेन-देन QR लाएँ")}
        </strong>
      </div>
      <p>
        {t(
          "Read an image locally. No camera or upload to a server.",
          "चित्र यहीं पढ़ें। कैमरा या सर्वर अपलोड नहीं।",
        )}
      </p>
      <label className="qr-file-label">
        {mode === "request"
          ? t("Payment request QR image", "भुगतान अनुरोध QR चित्र")
          : t("Transaction QR image", "लेन-देन QR चित्र")}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={
            mode === "request"
              ? t("Payment request QR image", "भुगतान अनुरोध QR चित्र")
              : t("Transaction QR image", "लेन-देन QR चित्र")
          }
          onChange={(e) => void image(e.target.files?.[0])}
        />
      </label>
      {mode === "request" && (
        <>
          <label htmlFor="request-uri">
            {t(
              "Or paste a Bitcoin request / testnet address",
              "या बिटकॉइन अनुरोध / टेस्टनेट पता पेस्ट करें",
            )}
          </label>
          <textarea
            id="request-uri"
            rows={2}
            value={text}
            maxLength={4096}
            spellCheck={false}
            onChange={(e) => {
              op.current?.abort();
              setBusy(false);
              setText(e.target.value);
              setRequest(undefined);
              setError("");
            }}
          />
          <button
            className="button secondary small"
            type="button"
            disabled={!text.trim() || busy}
            onClick={() => {
              try {
                accept(text);
              } catch (e) {
                setRequest(undefined);
                setError(e instanceof Error ? e.message : "Invalid request.");
              }
            }}
          >
            {t("Read payment request", "भुगतान अनुरोध पढ़ें")}
          </button>
        </>
      )}
      {busy && (
        <p role="status">
          {t("Reading QR image…", "QR चित्र पढ़ा जा रहा है…")}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {request && (
        <div className="qr-request-preview">
          <strong>
            {request.label ||
              t("Unverified recipient label", "असत्यापित प्राप्तकर्ता नाम")}
          </strong>
          <code>{request.address}</code>
          {request.amountSats !== undefined && (
            <p>
              {t("Requested", "अनुरोध")}:{" "}
              {request.amountSats.toLocaleString("en-IN")} sats
            </p>
          )}
          {request.message && (
            <p>
              {t("Untrusted request message", "असत्यापित अनुरोध संदेश")}:{" "}
              {request.message}
            </p>
          )}
          <p>
            {t(
              "A QR carries an address; it does not prove identity. Review through an independent channel before saving.",
              "QR में पता है; इससे पहचान सिद्ध नहीं होती। सहेजने से पहले अलग माध्यम से जाँचें।",
            )}
          </p>
          {request.ignoredParameters.length > 0 && (
            <p>
              {t(
                "Other payment instructions are not supported",
                "अन्य भुगतान निर्देश समर्थित नहीं",
              )}
              : {request.ignoredParameters.join(", ")}
            </p>
          )}
          <button
            className="button secondary small"
            type="button"
            onClick={() => onRequest?.(request)}
          >
            {t(
              "Use request in address form",
              "पता फ़ॉर्म में अनुरोध इस्तेमाल करें",
            )}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
