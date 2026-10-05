import {
  UserRound,
  Coins,
  Network,
  Wallet,
  Undo2,
  OctagonAlert,
  ArrowRight,
  CircleHelp,
  Check,
} from "lucide-react";
import type { FinalVerdict } from "../core/finalVerdict";
import type { Locale, VerificationReport } from "../core/types";
export function PictureReceipt({
  report,
  locale,
  final,
}: {
  report: VerificationReport;
  locale: Locale;
  final?: FinalVerdict;
}) {
  const t = (en: string, hi: string) => (locale === "hi-IN" ? hi : en),
    p = report.speakableParameters;
  const number = (v?: string) => (v && /^\d+$/.test(v) ? BigInt(v) : undefined);
  const fmt = (v?: string) =>
    number(v)?.toLocaleString("en-IN") ?? t("Unknown", "अज्ञात");
  const external = number(p.externalAmount),
    recipient = number(p.recipientAmount);
  const other =
    external !== undefined && recipient !== undefined && external >= recipient
      ? (external - recipient).toString()
      : undefined;
  const name = p.recipient ?? t("Recipient unknown", "प्राप्तकर्ता अज्ञात");
  // Input-value evidence is required before a claimed fee becomes a fact.
  const feeUnverified = report.issues.some((i) =>
    [
      "MISSING_PREVOUT_EVIDENCE",
      "FEE_UNAVAILABLE",
      "INVALID_FEE",
      "INVALID_FACTS",
      "PARSE_FAILED",
    ].includes(i.code),
  );
  const cells = [
    {
      label: t("To ", "इनको जाएगा: ") + name,
      value: p.recipientAmount,
      Icon: UserRound,
    },
    {
      label: t("Other payments", "दूसरे पते पर भुगतान"),
      value: other,
      Icon: Coins,
    },
    {
      label: t("Extra fee", "अतिरिक्त शुल्क"),
      value: feeUnverified ? undefined : p.fee,
      Icon: Network,
    },
    {
      label: t("Total leaving", "वॉलेट से कुल खर्च"),
      value: feeUnverified ? undefined : p.debit,
      Icon: Wallet,
    },
    {
      label: t("Configured change", "बचा हुआ बिटकॉइन"),
      value: p.change,
      Icon: Undo2,
    },
  ];
  const verdict =
    final ??
    (report.verdict === "MATCH"
      ? "GO"
      : report.verdict === "MISMATCH"
        ? "DO_NOT_SIGN"
        : "CANT_TELL");
  const ok = verdict === "GO",
    Icon = ok
      ? Check
      : verdict === "DO_NOT_SIGN" || verdict === "PAUSE"
        ? OctagonAlert
        : CircleHelp;
  return (
    <div
      className="picture-receipt"
      aria-label={t("Picture payment receipt", "चित्र में भुगतान का हिसाब")}
    >
      <div
        className={"receipt-stop " + (ok ? "receipt-match" : "receipt-warning")}
      >
        <Icon size={38} aria-hidden="true" />
        <div>
          <strong>
            {ok
              ? t("Instruction matches", "निर्देश मेल खाता है")
              : verdict === "PAUSE"
                ? t("PAUSE · CHECK FIRST", "रुकें · पहले जाँचें")
                : t("DO NOT SIGN", "साइन न करें")}
          </strong>
          <p>
            {ok
              ? t(
                  "This is not a guarantee of safety.",
                  "यह सुरक्षा की गारंटी नहीं है।",
                )
              : verdict === "PAUSE"
                ? t(
                    "The numbers match, but the situation looks risky. Confirm independently before signing.",
                    "राशि मेल खाती है, पर स्थिति जोखिम भरी लगती है। साइन से पहले अलग से पुष्टि करें।",
                  )
                : t(
                    "Fix the warning or missing information first.",
                    "पहले चेतावनी या अधूरी जानकारी ठीक करें।",
                  )}
          </p>
        </div>
      </div>
      <div className="asked-payment">
        <UserRound size={32} aria-hidden="true" />
        <div>
          <span>{t("You asked", "आपका निर्देश")}</span>
          <strong>
            {name} · {fmt(p.expectedAmount)} <small>sats</small>
          </strong>
        </div>
        <ArrowRight size={26} aria-hidden="true" />
      </div>
      <dl className="receipt-pictures">
        {cells.map(({ label, value, Icon }) => (
          <div key={label} aria-label={label}>
            <Icon size={32} aria-hidden="true" />
            <dt>{label}</dt>
            <dd>
              {fmt(value)}
              {number(value) !== undefined && <small> sats</small>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="receipt-meaning">
        {t(
          "Fee = extra Bitcoin paid to the network, not the person. Change = an output matching your configured change address; ownership is not proven. Sats are small Bitcoin units, not rupees.",
          "शुल्क भुगतान पहुँचाने का खर्च है, व्यक्ति को दिया पैसा नहीं। बचा हुआ बिटकॉइन आपके बताए पते पर जाएगा; वह पता आपका है या नहीं, यह साबित नहीं हुआ है। सैट्स बिटकॉइन की छोटी इकाई है, रुपये नहीं।",
        )}
      </p>
    </div>
  );
}
