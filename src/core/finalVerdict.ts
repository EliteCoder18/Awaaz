import type { AiDecision } from "./aiContract";
import type { Locale, LocalizedReport, VerificationReport } from "./types";

export type FinalVerdict = "GO" | "PAUSE" | "DO_NOT_SIGN" | "CANT_TELL";

// Code checks the facts; the AI judges the situation. The AI can only make the
// outcome stricter: it can never turn a code MISMATCH/INCOMPLETE into GO.
export function combineVerdict(
  code: VerificationReport["verdict"],
  ai?: AiDecision,
): FinalVerdict {
  if (code === "MISMATCH") return "DO_NOT_SIGN";
  if (code === "INCOMPLETE") return ai === "block" ? "DO_NOT_SIGN" : "CANT_TELL";
  if (ai === "block") return "DO_NOT_SIGN";
  if (ai === "pause") return "PAUSE";
  return "GO";
}

export function finalVerdictLabel(verdict: FinalVerdict, locale: Locale) {
  const hi = locale === "hi-IN";
  return {
    GO: hi ? "आगे बढ़ सकते हैं" : "Go ahead",
    PAUSE: hi ? "रुकें और जाँचें" : "Pause & check",
    DO_NOT_SIGN: hi ? "साइन न करें" : "Do not sign",
    CANT_TELL: hi ? "पता नहीं चल सका" : "Can't tell yet",
  }[verdict];
}

// Rewrites the code-only wording when the AI tightened the verdict, so every
// view (cards, narration, accessible mode) shows the same final outcome.
export function applyFinalVerdict(
  localized: LocalizedReport,
  final: FinalVerdict,
  code: VerificationReport["verdict"],
  aiReasons: string[],
  locale: Locale,
  ai?: { explanation?: string; lock: "verified" | "blocked" },
): LocalizedReport {
  const hi = locale === "hi-IN";
  const tightened =
    (code === "MATCH" && final !== "GO") ||
    (code === "INCOMPLETE" && final === "DO_NOT_SIGN");
  const base: LocalizedReport = ai
    ? {
        ...localized,
        explanation: ai.explanation,
        lock: ai.lock,
        // A verified AI explanation replaces the template narration.
        speech: ai.explanation
          ? [localized.title, ai.explanation].join(" ")
          : localized.speech,
      }
    : localized;
  if (!tightened) return base;
  const title =
    final === "PAUSE"
      ? hi
        ? "रुकें। भुगतान मेल खाता है, पर स्थिति संदिग्ध है।"
        : "Pause. The payment matches, but the situation needs a check."
      : hi
        ? "साइन न करें। AI जाँच ने धोखे के संकेत पाए।"
        : "Do not sign. The AI check found scam warning signs.";
  const instruction =
    final === "PAUSE"
      ? hi
        ? "तथ्य आपके निर्देश से मेल खाते हैं। साइन करने से पहले नीचे दी गई बातें किसी भरोसेमंद तरीके से जाँचें।"
        : "The facts match your instruction. Before signing, check the points below through a channel you already trust."
      : hi
        ? "यह भुगतान न करें। किसी भरोसेमंद व्यक्ति से बात करें।"
        : "Do not make this payment. Talk to someone you trust first.";
  return {
    ...base,
    title,
    instruction,
    details: [...aiReasons, ...localized.details],
    speech: ai?.explanation
      ? [title, ai.explanation].join(" ")
      : [title, instruction, ...aiReasons, localized.speech].join(" "),
  };
}
