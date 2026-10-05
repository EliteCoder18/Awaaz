import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Headphones,
  Info,
  Languages,
  LoaderCircle,
  Mic,
  RefreshCcw,
  ShieldCheck,
  Square,
  Upload,
  Download,
  Volume2,
  Ear,
} from "lucide-react";
import { recognizeSpeech } from "../adapters/speechRecognizer";
import { speakLocalizedReport } from "../adapters/speechSynthesis";
import { runVerification } from "../adapters/verificationClient";
import { fetchPreviousTransactions } from "../adapters/prevTxFetch";
import { parsePsbt } from "../core/psbtParser";
import { missingPrevoutTxids } from "../core/prevoutEvidence";
import { buildReviewRequest, requestAiReview } from "../adapters/aiReview";
import type { AiReviewResponse } from "../core/aiContract";
import {
  applyFinalVerdict,
  combineVerdict,
  finalVerdictLabel,
} from "../core/finalVerdict";
import { fromBase64, fromHex, toBase64, toHex } from "../core/encoding";
import { interpretIntent } from "../core/intentInterpreter";
import { confirmIntent } from "../core/intentConfirmation";
import { presentReport } from "../core/reportPresenter";
import type { Locale, LocalizedReport, ReviewSnapshot } from "../core/types";
import {
  buildDemoPsbt,
  demoPreviousTransaction,
  type DemoScenario,
} from "../demo/fixtures";
import {
  initialWorkflowState,
  workflowReducer,
  type WorkflowEvent,
} from "./workflow";
import { WalletProfileEditor } from "./WalletProfileEditor";
import { IntentReview } from "./IntentReview";
import { TransactionReview } from "./TransactionReview";
import { PaymentContextForm } from "./PaymentContextForm";
import { QrImport } from "./QrImport";
import { ReviewConversation } from "./ReviewConversation";
import { NetworkContext } from "./NetworkContext";
import { PsbtPreview } from "./PsbtPreview";
import { ReviewGuide, type GuideStep } from "./ReviewGuide";
import { AccessibleReview } from "./AccessibleReview";
import { AiCheck } from "./AiCheck";
import { useAccessibilityMode } from "./useAccessibilityMode";
import "./app.css";
import "./companion.css";
import "./accessibility.css";

const PRESETS: Record<Locale, string> = {
  "en-IN": "Send 50,000 sats to Riya",
  "hi-IN": "रिया को पचास हजार सैट्स भेजो",
};
export function App({
  embedded = false,
  fileFirst = false,
  active = true,
  demoRequest = 0,
  onSession,
  onLocaleChange,
}: {
  embedded?: boolean;
  fileFirst?: boolean;
  active?: boolean;
  demoRequest?: number;
  onSession?: (s: import("./site/session").SessionOverview) => void;
  onLocaleChange?: (locale: Locale) => void;
} = {}) {
  const [accessible, setAccessible] = useAccessibilityMode();
  const [speechRate, setSpeechRate] = useState(0.9);
  const [state, dispatch] = useReducer(
    workflowReducer,
    initialWorkflowState,
    (initial) => ({
      ...initial,
      locale:
        fileFirst &&
        new URLSearchParams(window.location.search).get("details") !== "1" &&
        new URLSearchParams(window.location.search).get("lang") !== "en"
          ? "hi-IN"
          : initial.locale,
    }),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const operation = useRef<AbortController | undefined>(undefined);
  const [psbtText, setPsbtText] = useState(""),
    [consent, setConsent] = useState(false),
    [autoRead, setAutoRead] = useState(false),
    [audioStatus, setAudioStatus] = useState("");
  const [fileBusy, setFileBusy] = useState(false);
  const [simple, setSimple] = useState(
    () =>
      embedded &&
      new URLSearchParams(window.location.search).get("details") !== "1",
  );
  const [quiet, setQuiet] = useState(false);
  const [interactionEpoch, setInteractionEpoch] = useState(0);
  const [viewedStep, setViewedStep] = useState<GuideStep>();
  const [comparisonOpen, setComparisonOpen] = useState(false);
  useEffect(() => {
    setComparisonOpen(false);
  }, [state.psbtBytes]);
  useEffect(() => {
    if (comparisonOpen) document.getElementById("intent-heading")?.focus();
  }, [comparisonOpen]);
  const simpleView = simple || accessible;
  const psbtFirst = (fileFirst || accessible) && simpleView;
  const guidedStep: GuideStep =
    viewedStep ??
    (state.result
      ? 3
      : psbtFirst
        ? state.psbtBytes
          ? 2
          : 1
        : state.intent
          ? 2
          : 1);
  const previousStep = useRef(guidedStep);
  useEffect(() => {
    if (active && simpleView && previousStep.current !== guidedStep) {
      const id = (
        psbtFirst
          ? ["transaction-heading", "transaction-heading", "review-heading"]
          : ["intent-heading", "transaction-heading", "review-heading"]
      )[guidedStep - 1];
      document.getElementById(id)?.focus({ preventScroll: false });
    }
    previousStep.current = guidedStep;
  }, [active, simpleView, guidedStep]);
  useEffect(() => {
    setViewedStep(undefined);
  }, [state.revision, state.result, state.intent]);
  const reportRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const lastDemo = useRef(0);
  const hi = state.locale === "hi-IN",
    t = (en: string, hin: string) => (hi ? hin : en);
  const codeLocalized = useMemo(
    () =>
      state.result
        ? presentReport(state.result.receipt.report, state.locale)
        : undefined,
    [state.result, state.locale],
  );
  // AI safety check: judges the situation after the code check. It can only
  // make the final verdict stricter.
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiReview, setAiReview] = useState<{
    key: string;
    status: "loading" | "done" | "error";
    data?: AiReviewResponse;
  }>();
  const aiKey = state.result
    ? `${state.sessionId}:${state.revision}:${state.locale}`
    : "";
  const currentAi = aiEnabled && aiReview?.key === aiKey ? aiReview : undefined;
  const finalVerdict = state.result
    ? combineVerdict(
        state.result.receipt.report.verdict,
        currentAi?.status === "done" ? currentAi.data?.decision : undefined,
      )
    : undefined;
  const localized = useMemo(
    () =>
      codeLocalized && state.result && finalVerdict
        ? applyFinalVerdict(
            codeLocalized,
            finalVerdict,
            state.result.receipt.report.verdict,
            currentAi?.data?.reasons.map((r) => r.text) ?? [],
            state.locale,
          )
        : codeLocalized,
    [codeLocalized, finalVerdict, currentAi, state.result, state.locale],
  );
  const autoReadRef = useRef(false);
  useEffect(() => {
    if (!state.result || !state.intent || !aiEnabled || !active) return;
    const key = aiKey;
    const controller = new AbortController();
    setAiReview({ key, status: "loading" });
    requestAiReview(
      buildReviewRequest(
        state.result,
        state.intent,
        state.profile,
        state.intent.context ?? state.context,
        state.locale,
      ),
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted)
          setAiReview({ key, status: "done", data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setAiReview({ key, status: "error" });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiKey, aiEnabled, active]);
  useEffect(() => {
    // Deferred auto-read: speak once the AI check settles (or right away when off).
    if (!autoReadRef.current || !localized) return;
    if (aiEnabled && (!currentAi || currentAi.status === "loading")) return;
    autoReadRef.current = false;
    if (!accessible) read(localized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localized, currentAi, aiEnabled]);
  useEffect(() => {
    document.documentElement.lang = hi ? "hi" : "en";
    if (active) onLocaleChange?.(state.locale);
  }, [hi, active]);
  useEffect(() => {
    cancel();
    setViewedStep(undefined);
    setInteractionEpoch((epoch) => epoch + 1);
    dispatch({ type: "SUSPEND" });
  }, [accessible]);
  useEffect(() => {
    if (!active) {
      cancel();
      dispatch({ type: "SUSPEND" });
    }
  }, [active]);
  useEffect(() => {
    if (active && demoRequest > 0 && demoRequest !== lastDemo.current) {
      lastDemo.current = demoRequest;
      reset();
      const transcript = PRESETS[state.locale];
      dispatch({ type: "EDIT_TRANSCRIPT", transcript });
      dispatch({
        type: "SET_DRAFT",
        draft: interpretIntent(
          { transcript, locale: state.locale, source: "preset" },
          initialWorkflowState.profile.addressBook,
        ),
      });
      dispatch({
        type: "SET_PSBT",
        bytes: fromBase64(buildDemoPsbt("tampered")),
        name: "demo-tampered.psbt",
      });
    }
  }, [active, demoRequest]);
  useEffect(() => {
    onSession?.({
      hasIntent: !!state.intent,
      hasTransaction: !!state.psbtBytes,
      verdict: finalVerdict && finalVerdictLabel(finalVerdict, state.locale),
    });
  }, [state.intent, state.psbtBytes, state.result, finalVerdict, onSession]);
  useEffect(
    () => () => {
      operation.current?.abort();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  useEffect(() => {
    if (state.result) {
      if (accessible) document.getElementById("accessible-signing-heading")?.focus();
      else reportRef.current?.focus({ preventScroll: true });
    }
  }, [state.result, accessible]);
  function cancel() {
    operation.current?.abort();
    operation.current = undefined;
    window.speechSynthesis?.cancel();
    setAudioStatus("");
    setFileBusy(false);
  }
  function mutate(e: WorkflowEvent) {
    cancel();
    dispatch(e);
  }
  function fail(message: string) {
    dispatch({ type: "SET_ERROR", error: message });
  }
  const missingTxids = useMemo(() => {
    if (!state.psbtBytes) return [];
    try {
      return missingPrevoutTxids(
        state.result?.facts ??
          parsePsbt(state.psbtBytes, state.profile, state.evidence),
      );
    } catch {
      return [];
    }
  }, [state.psbtBytes, state.profile, state.evidence, state.result]);
  const [proofStatus, setProofStatus] = useState("");
  const verifyAfterProof = useRef(false);
  async function fetchMissingProof() {
    if (!missingTxids.length || fileBusy) return;
    cancel();
    const controller = new AbortController();
    operation.current = controller;
    setFileBusy(true);
    setProofStatus(t("Fetching proof…", "प्रमाण लाया जा रहा है…"));
    try {
      const fetched = await fetchPreviousTransactions(
        missingTxids,
        controller.signal,
        demoPreviousTransaction,
      );
      if (controller.signal.aborted) return;
      const demo = fetched.some((f) => f.source === "demo");
      setProofStatus(
        t(
          `Fetched ${fetched.length} of ${missingTxids.length}${demo ? " from the built-in demo source" : " from mempool.space"}. Each one is checked against its transaction ID on this device.`,
          `${missingTxids.length} में से ${fetched.length} प्रमाण ${demo ? "डेमो स्रोत" : "mempool.space"} से मिले। हर एक की जाँच इसी डिवाइस पर लेन-देन ID से की जाती है।`,
        ),
      );
      operation.current = undefined;
      setFileBusy(false);
      verifyAfterProof.current = true;
      dispatch({
        type: "SET_EVIDENCE",
        evidence: {
          previousTransactions: [
            ...state.evidence.previousTransactions,
            ...fetched.map((f) => f.bytes),
          ],
        },
      });
    } catch (e) {
      if (!controller.signal.aborted)
        setProofStatus(
          t(
            "Proof could not be fetched. You can still add the previous transaction file manually.",
            "प्रमाण नहीं मिला। आप पिछले लेन-देन की फ़ाइल खुद जोड़ सकते हैं।",
          ) + (e instanceof Error ? " (" + e.message + ")" : ""),
        );
    } finally {
      if (operation.current === controller) {
        operation.current = undefined;
        setFileBusy(false);
      }
    }
  }
  useEffect(() => {
    if (!verifyAfterProof.current || fileBusy) return;
    verifyAfterProof.current = false;
    if (state.intent && state.psbtBytes && state.profileReviewed) void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.evidence, fileBusy]);
  useEffect(() => setProofStatus(""), [state.psbtBytes, state.sessionId]);
  const missingProof = (missingTxids.length > 0 || proofStatus) && (
    <div className="missing-proof" role="status">
      {missingTxids.length > 0 && (
        <>
          <p>
            {t(
              `Awaaz needs proof of how much ${missingTxids.length === 1 ? "the coin being spent is" : "the coins being spent are"} worth before it can check the fee.`,
              "फीस जाँचने से पहले Awaaz को खर्च हो रहे सिक्कों की कीमत का प्रमाण चाहिए।",
            )}
          </p>
          <button
            className="button secondary small"
            type="button"
            onClick={() => void fetchMissingProof()}
            disabled={fileBusy}
          >
            {fileBusy ? (
              <LoaderCircle className="spin" size={16} aria-hidden="true" />
            ) : (
              <Download size={16} aria-hidden="true" />
            )}
            {t("Fetch missing proof", "छूटा प्रमाण लाएँ")}
          </button>
          <p className="fine-print">
            {t(
              "Sends only the transaction ID to mempool.space (public testnet). Nothing about you, the amount or the recipient is sent.",
              "केवल लेन-देन ID mempool.space (सार्वजनिक testnet) को भेजी जाती है। आपकी, राशि या प्राप्तकर्ता की कोई जानकारी नहीं जाती।",
            )}
          </p>
        </>
      )}
      {proofStatus && <p className="muted">{proofStatus}</p>}
    </div>
  );
  function read(report: LocalizedReport, locale = state.locale) {
    if (quiet) {
      setAudioStatus(
        t(
          "Sound is off. Use the on-screen explanation.",
          "आवाज़ बंद है। स्क्रीन पर विवरण देखें।",
        ),
      );
      return;
    }
    const revision = stateRef.current.revision,
      sessionId = stateRef.current.sessionId;
    try {
      const ok = speakLocalizedReport(
        report,
        locale,
        undefined,
        undefined,
        () => {
          if (
            stateRef.current.revision === revision &&
            stateRef.current.sessionId === sessionId
          )
            setAudioStatus(
              t(
                "Speech playback failed. The complete text remains available.",
                "आवाज़ नहीं चल सकी। पूरा विवरण पढ़ने के लिए उपलब्ध है।",
              ),
            );
        },
        () => {
          if (
            stateRef.current.revision === revision &&
            stateRef.current.sessionId === sessionId
          )
            setAudioStatus(t("Playback complete.", "विवरण पूरा सुनाया गया।"));
        },
        speechRate,
      );
      setAudioStatus(
        ok
          ? t(
              "Reading aloud. Use Stop audio to interrupt.",
              "विवरण सुनाया जा रहा है। रोकने के लिए आवाज़ रोकें दबाएँ।",
            )
          : t(
              "A voice for this language is unavailable. Use the written readback, or install a matching system voice.",
              "इस भाषा की आवाज़ उपलब्ध नहीं है। लिखित विवरण पढ़ें या सिस्टम में यह आवाज़ जोड़ें।",
            ),
      );
    } catch {
      setAudioStatus(
        t(
          "Audio is unavailable. The written readback is complete.",
          "आवाज़ उपलब्ध नहीं है। पूरा लिखित विवरण मौजूद है।",
        ),
      );
    }
  }
  function stopAudio() {
    window.speechSynthesis?.cancel();
    setAudioStatus(t("Audio stopped.", "आवाज़ रोक दी गई।"));
  }
  function preset() {
    const transcript = PRESETS[state.locale];
    mutate({ type: "EDIT_TRANSCRIPT", transcript });
    dispatch({
      type: "SET_DRAFT",
      draft: interpretIntent(
        { transcript, locale: state.locale, source: "preset" },
        state.profile.addressBook,
      ),
    });
  }
  function interpret() {
    if (!state.transcript.trim()) {
      fail(
        t(
          "Enter a payment instruction or use the demo phrase.",
          "भुगतान निर्देश लिखें या डेमो वाक्य इस्तेमाल करें।",
        ),
      );
      return;
    }
    cancel();
    dispatch({
      type: "SET_DRAFT",
      draft: interpretIntent(
        {
          transcript: state.transcript,
          locale: state.locale,
          source: "edited",
        },
        state.profile.addressBook,
      ),
    });
  }
  function confirm(script: string) {
    if (!state.draft) return;
    try {
      if (!/^\d+$/.test(state.feeText))
        throw new Error(
          t(
            "Enter a maximum total fee in whole sats.",
            "अधिकतम कुल शुल्क पूरे सैट्स में लिखें।",
          ),
        );
      const intent = confirmIntent(
        state.draft,
        script,
        { maxFeeSats: BigInt(state.feeText), revision: state.revision },
        state.revision,
      );
      mutate({
        type: "CONFIRM_INTENT",
        intent: { ...intent, context: { ...state.context } },
      });
    } catch (e) {
      fail(e instanceof Error ? e.message : "Check the payment fields.");
    }
  }
  async function listen() {
    if (!consent || state.phase === "capturing_intent") return;
    cancel();
    const controller = new AbortController();
    operation.current = controller;
    const sessionId = state.sessionId,
      revision = state.revision + 1;
    dispatch({ type: "START_LISTENING" });
    try {
      const speech = await recognizeSpeech(
        state.locale,
        undefined,
        10000,
        controller.signal,
      );
      if (
        controller.signal.aborted ||
        stateRef.current.sessionId !== sessionId ||
        stateRef.current.revision !== revision
      )
        return;
      dispatch({
        type: "SPEECH_RESULT",
        transcript: speech.transcript,
        sessionId,
        revision,
      });
      dispatch({
        type: "SET_DRAFT",
        draft: interpretIntent(speech, stateRef.current.profile.addressBook),
      });
    } catch (e) {
      if (controller.signal.aborted) return;
      dispatch({
        type: "SET_ERROR",
        sessionId,
        revision,
        error:
          (e instanceof Error
            ? e.message
            : t("Recognition failed.", "आवाज़ समझी नहीं जा सकी।")) +
          " " +
          t(
            "Use the editable transcript or demo phrase instead.",
            "लिखित निर्देश या डेमो वाक्य इस्तेमाल करें।",
          ),
      });
    } finally {
      if (operation.current === controller) operation.current = undefined;
    }
  }
  function loadDemo(scenario: DemoScenario) {
    setPsbtText("");
    mutate({
      type: "SET_PSBT",
      bytes: fromBase64(buildDemoPsbt(scenario)),
      name: "demo-" + scenario + ".psbt",
    });
  }
  function importPaste() {
    try {
      mutate({
        type: "SET_PSBT",
        bytes: fromBase64(psbtText, state.profile.maxPsbtBytes),
        name: "Pasted PSBT",
      });
    } catch (e) {
      mutate({ type: "EDIT_PSBT" });
      fail(e instanceof Error ? e.message : "Invalid PSBT.");
    }
  }
  async function loadFile(file: File | undefined) {
    if (!file) return;
    mutate({ type: "EDIT_PSBT" });
    setPsbtText("");
    const controller = new AbortController();
    operation.current = controller;
    setFileBusy(true);
    try {
      if (file.size > 100000)
        throw new Error(
          t(
            "File exceeds the 100,000-byte limit.",
            "फ़ाइल 100,000 बाइट की सीमा से बड़ी है।",
          ),
        );
      const raw = new Uint8Array(await file.arrayBuffer());
      if (controller.signal.aborted) return;
      const bytes =
        toHex(raw.subarray(0, 5)) === "70736274ff"
          ? raw
          : fromBase64(new TextDecoder().decode(raw), 100000);
      dispatch({ type: "SET_PSBT", bytes, name: file.name });
    } catch (e) {
      if (!controller.signal.aborted)
        fail(
          e instanceof Error
            ? e.message
            : t(
                "The selected file could not be read.",
                "चुनी फ़ाइल पढ़ी नहीं जा सकी।",
              ),
        );
    } finally {
      if (operation.current === controller) {
        operation.current = undefined;
        setFileBusy(false);
      }
    }
  }
  async function loadEvidence(files: FileList | null) {
    if (!files?.length) return;
    cancel();
    dispatch({ type: "SET_EVIDENCE", evidence: { previousTransactions: [] } });
    const controller = new AbortController();
    operation.current = controller;
    setFileBusy(true);
    try {
      const list = Array.from(files);
      if (
        list.reduce((sum, f) => sum + f.size, 0) > 5_000_000 ||
        list.some((f) => f.size > 1_000_000)
      )
        throw new Error(
          t(
            "Evidence limit: 1 MB per file, 5 MB total.",
            "प्रमाण सीमा: प्रत्येक फ़ाइल 1 MB, कुल 5 MB।",
          ),
        );
      const previousTransactions = await Promise.all(
        list.map(async (file) => {
          const raw = new Uint8Array(await file.arrayBuffer());
          const text = new TextDecoder().decode(raw).trim().replace(/\s/g, "");
          return /^(?:[a-f0-9]{2})+$/i.test(text) ? fromHex(text) : raw;
        }),
      );
      if (!controller.signal.aborted)
        dispatch({ type: "SET_EVIDENCE", evidence: { previousTransactions } });
    } catch (e) {
      if (!controller.signal.aborted)
        fail(e instanceof Error ? e.message : "Evidence could not be read.");
    } finally {
      if (operation.current === controller) {
        operation.current = undefined;
        setFileBusy(false);
      }
    }
  }
  async function verify() {
    if (
      !state.intent ||
      !state.psbtBytes ||
      !state.profileReviewed ||
      fileBusy ||
      state.phase === "verifying"
    )
      return;
    cancel();
    const controller = new AbortController();
    operation.current = controller;
    const snapshot: ReviewSnapshot = {
      intent: state.intent,
      profile: state.profile,
      psbtBytes: state.psbtBytes,
      evidence: state.evidence,
      sessionId: state.sessionId,
      revision: state.revision,
    };
    dispatch({ type: "START_VERIFYING" });
    try {
      const result = await runVerification(snapshot, controller.signal);
      if (
        controller.signal.aborted ||
        stateRef.current.sessionId !== snapshot.sessionId ||
        stateRef.current.revision !== snapshot.revision
      )
        return;
      dispatch({ type: "SET_RESULT", result });
      if (autoRead && !accessible) autoReadRef.current = true;
    } catch (e) {
      if (!controller.signal.aborted)
        dispatch({
          type: "SET_ERROR",
          sessionId: snapshot.sessionId,
          revision: snapshot.revision,
          error:
            e instanceof Error
              ? e.message
              : t(
                  "Verification failed. Try again.",
                  "सत्यापन नहीं हुआ। फिर कोशिश करें।",
                ),
        });
    } finally {
      if (operation.current === controller) operation.current = undefined;
    }
  }
  function reset() {
    cancel();
    setPsbtText("");
    setConsent(false);
    setAutoRead(false);
    dispatch({ type: "RESET" });
  }
  const completed = [
    Boolean(state.intent),
    Boolean(state.psbtBytes),
    Boolean(state.result),
  ];
  const stepLabels = [
    t("Say what you intend", "अपना निर्देश कहें"),
    t("Bring your transaction", "लेन-देन लाएँ"),
    t("Take a second look", "दोबारा जाँचें"),
  ];
  const canVerify = Boolean(
    state.intent &&
    state.psbtBytes &&
    state.profileReviewed &&
    !fileBusy &&
    state.phase !== "verifying",
  );
  const ReviewHeader = embedded ? "section" : "header";
  const ImportControls = psbtFirst && state.psbtBytes ? "details" : "div";
  const DemoOptions = psbtFirst ? "details" : "div";
  const IntentPanel = psbtFirst ? "details" : "section";
  function readIntent() {
    const d = state.draft;
    if (!d) return;
    const contact = state.profile.addressBook.find(
      (c) => c.id === d.recipientAlias,
    );
    const text = hi
      ? "प्राप्तकर्ता " +
        (contact?.displayName ?? "अस्पष्ट") +
        "। राशि " +
        (d.amountSats?.toLocaleString("en-IN") ?? "अस्पष्ट") +
        " सैट्स। अधिकतम शुल्क " +
        state.feeText +
        " सैट्स। पता " +
        (contact?.address ?? "अस्पष्ट") +
        "।"
      : "Recipient " +
        (contact?.displayName ?? "unresolved") +
        ". Amount " +
        (d.amountSats?.toLocaleString("en-IN") ?? "unresolved") +
        " sats. Maximum fee " +
        state.feeText +
        " sats. Address " +
        (contact?.address ?? "unresolved") +
        ".";
    read({ title: "", instruction: "", details: [], speech: text });
  }
  return (
    <MotionConfig reducedMotion={accessible ? "always" : "user"}>
      <div
        className={
          "app-shell" +
          (embedded ? " embedded-review" : "") +
          (simpleView ? " simple-review" : "") +
          (psbtFirst ? " file-first-review" : "") +
          (accessible ? " accessible-app" : "")
        }
      >
        <a className="skip-link" href="#workspace">
          {t("Skip to payment review", "भुगतान जाँच पर जाएँ")}
        </a>
        <ReviewHeader
          className="site-header"
          aria-label={
            embedded ? t("Review controls", "जाँच नियंत्रण") : undefined
          }
        >
          <a className="brand" href="#top" aria-label="Awaaz home">
            <span className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span>
              awaaz
              <span className="brand-devanagari" lang="hi">
                आवाज़
              </span>
            </span>
          </a>
          <div className="header-actions">
            {!embedded && <button className="accessibility-toggle" type="button" aria-pressed={accessible} onClick={() => setAccessible(!accessible)}>
              <Ear size={22} aria-hidden="true" />
              {t("Accessible review", "सुलभ जाँच")}
            </button>}
            <span className="network-badge">
              <span />
              {t("Testnet only", "केवल टेस्टनेट")}
            </span>
            <label className="language-control">
              <Languages size={16} aria-hidden="true" />
              <span className="sr-only">{t("Language", "भाषा")}</span>
              <select
                aria-label={t("Language", "भाषा")}
                value={state.locale}
                onChange={(e) =>
                  mutate({
                    type: "SET_LOCALE",
                    locale: e.target.value as Locale,
                  })
                }
              >
                <option value="en-IN">English</option>
                <option value="hi-IN">हिंदी</option>
              </select>
            </label>
            <button className="reset-button" onClick={reset} type="button">
              <RefreshCcw size={15} aria-hidden="true" />
              {t("Reset session", "सत्र रीसेट करें")}
            </button>
          </div>
        </ReviewHeader>
        <main id="workspace" tabIndex={-1}>
          {embedded && (
            <div className="workspace-intro">
              <span className="section-kicker">
                {t("THE WORKING DESK", "आपकी भुगतान जाँच")}
              </span>
              <h1 tabIndex={-1}>
                {psbtFirst
                  ? t(
                      "Show your file. Understand your payment.",
                      "फ़ाइल दिखाएँ। भुगतान समझें।",
                    )
                  : t("Payment review.", "भुगतान की जाँच।")}
              </h1>
              <p>
                {t(
                  psbtFirst
                    ? "Upload the unsigned file from your wallet. Get a plain-language explanation. No money is sent here."
                    : simpleView
                      ? "Three steps. No money is sent here."
                      : "Your instruction on one side. The actual transaction on the other.",
                  psbtFirst
                    ? "बिना साइन की PSBT का हिसाब आसान हिंदी में देखें या सुनें।"
                    : simpleView
                      ? "तीन चरण। यहाँ पैसे नहीं भेजे जाते।"
                      : "एक ओर आपकी मंशा। दूसरी ओर लेन-देन के तथ्य।",
                )}
              </p>
            </div>
          )}
          {!embedded && (
            <motion.section
              id="top"
              className="hero"
              initial={{ y: reduced ? 0 : 12 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.45 }}
              aria-labelledby="hero-heading"
            >
              <div>
                <p className="eyebrow">
                  <span className="small-line" />
                  {t("THE BITCOIN REVIEW DESK", "बिटकॉइन की स्वतंत्र जाँच")}
                </p>
                <h1 id="hero-heading">
                  {t("Understand.", "पहले समझो।")}
                  <br />
                  <em>{t("Before you sign.", "साइन करने से पहले।")}</em>
                </h1>
                <p className="hero-description">
                  {t(
                    "A payment has a story. A transaction has facts. Awaaz helps you see whether they agree—before you sign in your wallet.",
                    "भुगतान के पीछे एक कहानी होती है। लेन-देन में तथ्य होते हैं। आवाज़ दोनों का मेल समझाता है—वॉलेट में साइन करने से पहले।",
                  )}
                </p>
              </div>
              <div className="hero-note">
                <div className="desk-folio" aria-hidden="true">
                  <span>आ</span>
                  <i>01—03</i>
                </div>
                <p lang="hi">आपकी बात। असली हिसाब।</p>
                <span>
                  {t("YOUR STORY / THE FACTS", "आपकी कहानी / जाँचे तथ्य")}
                </span>
                <div className="hero-note-rule" />
                <small>
                  {t(
                    "No keys. No signing. Just a clearer decision.",
                    "न कुंजी, न साइन। बस स्पष्ट निर्णय।",
                  )}
                </small>
              </div>
            </motion.section>
          )}
          {accessible && (
            <AccessibleReview
              state={state}
              finalVerdict={finalVerdict}
              localized={localized}
              active={active}
              quiet={quiet}
              step={guidedStep}
              rate={speechRate}
              onRate={setSpeechRate}
              onLanguage={(locale) => mutate({ type: "SET_LOCALE", locale })}
              onRead={(speech) => read({ title: "", instruction: "", details: [], speech })}
              onStop={stopAudio}
              onSoundOn={() => setQuiet(false)}
              onStep={(step) => { cancel(); dispatch({ type: "SUSPEND" }); setViewedStep(step); }}
              onCompare={() => {
                stopAudio();
                setViewedStep(2);
                setComparisonOpen(true);
                requestAnimationFrame(() => document.getElementById("payment-instruction")?.focus());
              }}
              onDemo={() => loadDemo("correct")}
            />
          )}
          {embedded && !accessible && (
            <ReviewGuide
              locale={state.locale}
              simple={simpleView}
              fileFirst={psbtFirst}
              hasTransaction={!!state.psbtBytes}
              quiet={quiet}
              step={guidedStep}
              confirmed={!!state.intent}
              reviewed={!!state.result}
              onMode={(v) => {
                cancel();
                setInteractionEpoch((e) => e + 1);
                dispatch({ type: "SUSPEND" });
                setSimple(v);
              }}
              onQuiet={() => {
                cancel();
                setInteractionEpoch((e) => e + 1);
                dispatch({ type: "SUSPEND" });
                setQuiet(!quiet);
                setConsent(false);
                setAutoRead(false);
              }}
              onStep={(step) => {
                cancel();
                setInteractionEpoch((e) => e + 1);
                dispatch({ type: "SUSPEND" });
                setViewedStep(step);
              }}
              onRead={(text) =>
                read({
                  title: "",
                  instruction: text,
                  details: [],
                  speech: text,
                })
              }
              onStop={stopAudio}
            />
          )}
          {simpleView && (
            <p className="simple-audio-status" role="status">
              {audioStatus}
            </p>
          )}
          {simpleView && state.error && (
            <div className="error-banner" role="alert">
              <strong>
                {t("INCOMPLETE — DO NOT SIGN", "अधूरा — साइन न करें")}
              </strong>
              <p>{state.error}</p>
            </div>
          )}
          <div
            hidden={simpleView}
            className="workflow-strip"
            aria-label={t("Review progress", "जाँच की प्रगति")}
          >
            {stepLabels.map((label, index) => (
              <a
                href={["#intent", "#transaction", "#review"][index]}
                className={
                  "workflow-step " + (completed[index] ? "complete" : "")
                }
                key={label}
              >
                <span className="step-circle">
                  {completed[index] ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    "0" + (index + 1)
                  )}
                </span>
                <span>{label}</span>
                {index < 2 && (
                  <ArrowRight
                    className="step-arrow"
                    size={15}
                    aria-hidden="true"
                  />
                )}
              </a>
            ))}
          </div>
          <div className="workspace-grid">
            <div className="input-column" hidden={simpleView && guidedStep === 3}>
              <IntentPanel
                open={psbtFirst ? comparisonOpen : undefined}
                onToggle={
                  psbtFirst
                    ? (e) =>
                        setComparisonOpen(
                          (e.currentTarget as HTMLDetailsElement).open,
                        )
                    : undefined
                }
                id="intent"
                hidden={simpleView && guidedStep !== (psbtFirst ? 2 : 1)}
                className="panel"
                aria-labelledby="intent-heading"
              >
                {psbtFirst && (
                  <summary className="comparison-summary">
                    {t(
                      "Compare with the payment you intended",
                      "अपने चाहे हुए भुगतान से मेल जाँचें",
                    )}
                    <ArrowRight size={20} aria-hidden="true" />
                  </summary>
                )}
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      {t("01 / YOUR INTENTION", "०१ / आपका निर्देश")}
                    </p>
                    <h2 id="intent-heading" tabIndex={-1}>
                      {t(
                        "What would you like to send?",
                        "आप क्या भेजना चाहते हैं?",
                      )}
                    </h2>
                  </div>
                  <span className="panel-icon">
                    <Mic size={20} aria-hidden="true" />
                  </span>
                </div>
                <p className="section-description">
                  {t(
                    "Speak in Hindi or English, or write it down. Start with a name, an amount and sats or BTC.",
                    "हिंदी या अंग्रेज़ी में बोलें, या लिखें। नाम, राशि और सैट्स या BTC शामिल करें।",
                  )}
                </p>
                <label htmlFor="payment-instruction">
                  {t("Payment instruction", "भुगतान निर्देश")}
                </label>
                <div className="transcript-wrap">
                  <textarea
                    id="payment-instruction"
                    placeholder={t(
                      "“Send 50,000 sats to Riya”",
                      "“रिया को पचास हजार सैट्स भेजो”",
                    )}
                    value={state.transcript}
                    onChange={(e) =>
                      mutate({
                        type: "EDIT_TRANSCRIPT",
                        transcript: e.target.value,
                      })
                    }
                    rows={3}
                    maxLength={2000}
                  />
                  {state.phase === "capturing_intent" && (
                    <div className="listening">
                      <span className="listening-dot" />
                      {t("Listening…", "सुन रहा है…")}
                    </div>
                  )}
                </div>
                <div className="button-row">
                  <button
                    className="button"
                    type="button"
                    onClick={listen}
                    disabled={!consent || state.phase === "capturing_intent"}
                  >
                    <Mic size={17} aria-hidden="true" />
                    {t("Speak intent", "निर्देश बोलें")}
                  </button>
                  {state.phase === "capturing_intent" && (
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() => {
                        cancel();
                        dispatch({
                          type: "EDIT_TRANSCRIPT",
                          transcript: state.transcript,
                        });
                      }}
                    >
                      <Square size={13} aria-hidden="true" />
                      {t("Stop listening", "सुनना रोकें")}
                    </button>
                  )}
                  <button
                    className="button secondary"
                    type="button"
                    onClick={interpret}
                  >
                    {t("Review instruction", "निर्देश जाँचें")}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
                <label className="check-label speech-consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    disabled={quiet}
                    onChange={(e) => {
                      setConsent(e.target.checked);
                      if (
                        !e.target.checked &&
                        state.phase === "capturing_intent"
                      ) {
                        cancel();
                        dispatch({
                          type: "EDIT_TRANSCRIPT",
                          transcript: state.transcript,
                        });
                      }
                    }}
                  />
                  {t(
                    "Allow browser speech. Audio may be processed by the browser provider.",
                    "ब्राउज़र की आवाज़ सेवा की अनुमति दें। ऑडियो ब्राउज़र प्रदाता तक जा सकता है।",
                  )}
                </label>
                <div className="demo-phrase-row">
                  <span>{t("Just exploring?", "पहली बार देख रहे हैं?")}</span>
                  <button
                    className="text-button"
                    onClick={preset}
                    type="button"
                  >
                    {t("Use demo phrase", "डेमो वाक्य इस्तेमाल करें")}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </button>
                </div>
                <details open={!simpleView} className="context-disclosure">
                  <summary>
                    {t("More checks (optional)", "और जाँच (वैकल्पिक)")}
                  </summary>
                  <PaymentContextForm
                    value={state.context}
                    locale={state.locale}
                    onChange={(context) =>
                      mutate({ type: "EDIT_CONTEXT", context })
                    }
                  />
                </details>
                <div className="fee-field">
                  <div>
                    <label htmlFor="maximum-fee">
                      {t(
                        "Maximum total network fee",
                        "अधिकतम कुल नेटवर्क शुल्क",
                      )}
                    </label>
                    <p>
                      {t(
                        "Your limit, in exact sats. Nothing is pre-approved.",
                        "आपकी सीमा, सटीक सैट्स में। पहले से कोई अनुमति नहीं।",
                      )}
                    </p>
                  </div>
                  <div className="input-unit">
                    <input
                      id="maximum-fee"
                      inputMode="numeric"
                      value={state.feeText}
                      onChange={(e) =>
                        mutate({ type: "SET_FEE", feeText: e.target.value })
                      }
                      maxLength={16}
                      placeholder="2000"
                    />
                    <span>sats</span>
                  </div>
                </div>
                {state.draft && (
                  <IntentReview
                    quiet={quiet}
                    key={state.revision}
                    draft={state.draft}
                    profile={state.profile}
                    locale={state.locale}
                    feeText={state.feeText}
                    confirmed={Boolean(state.intent)}
                    onConfirm={confirm}
                    onRead={readIntent}
                  />
                )}
                {state.intent?.context?.purpose && (
                  <p className="confirmed-purpose">
                    {t("Your confirmed reason", "आपका पुष्टि किया कारण")}: “
                    {state.intent.context.purpose}”
                  </p>
                )}
                <WalletProfileEditor
                  key={state.sessionId}
                  active={
                    active && (!simpleView || guidedStep === (psbtFirst ? 2 : 1))
                  }
                  interactionEpoch={interactionEpoch}
                  profile={state.profile}
                  locale={state.locale}
                  onDirty={() => mutate({ type: "PROFILE_EDIT" })}
                  onApply={(profile) => {
                    setPsbtText("");
                    mutate({ type: "SET_PROFILE", profile });
                  }}
                />
                {psbtFirst && (
                  <button
                    className="button verify-button"
                    type="button"
                    disabled={!canVerify}
                    onClick={() => void verify()}
                  >
                    <ShieldCheck size={20} aria-hidden="true" />
                    {state.phase === "verifying"
                      ? t("Reviewing transaction…", "लेन-देन जाँचा जा रहा है…")
                      : t("Verify transaction", "लेन-देन सत्यापित करें")}
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                )}
                {!state.profileReviewed && (
                  <p className="inline-error">
                    {t(
                      "Address configuration changed. Save independently reviewed addresses before confirming.",
                      "पते बदले हैं। पुष्टि से पहले स्वतंत्र रूप से जाँचे पते सहेजें।",
                    )}
                  </p>
                )}
              </IntentPanel>
              <section
                id="transaction"
                hidden={
                  simpleView && (psbtFirst ? guidedStep === 3 : guidedStep !== 2)
                }
                className="panel"
                aria-labelledby="transaction-heading"
              >
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">
                      {t(
                        psbtFirst
                          ? "01 / YOUR UNSIGNED FILE"
                          : "02 / THE ACTUAL TRANSACTION",
                        psbtFirst
                          ? "०१ / बिना साइन की फ़ाइल"
                          : "०२ / वास्तविक लेन-देन",
                      )}
                    </p>
                    <h2 id="transaction-heading" tabIndex={-1}>
                      {t(
                        psbtFirst
                          ? state.psbtBytes
                            ? "Here is what the file says."
                            : "Show your unsigned transaction."
                          : "Bring the payment into focus.",
                        psbtFirst
                          ? state.psbtBytes
                            ? "यह फ़ाइल क्या करेगी?"
                            : "अपनी PSBT फ़ाइल चुनें।"
                          : "भुगतान को स्पष्ट रूप से देखें।",
                      )}
                    </h2>
                  </div>
                  <span className="panel-icon">
                    <FileText size={20} aria-hidden="true" />
                  </span>
                </div>
                <p className="section-description">
                  {t(
                    psbtFirst
                      ? "A PSBT is a payment file prepared by your wallet. Show it here before signing. Your private key is not needed."
                      : "Import the unsigned transaction your wallet prepared. Awaaz reads the payment itself, including every output.",
                    psbtFirst
                      ? state.psbtBytes
                        ? "यह वॉलेट की बनाई भुगतान फ़ाइल का हिसाब है। यहाँ पैसे नहीं भेजे जाते।"
                        : "वॉलेट से बिना साइन की PSBT लें। निजी कुंजी नहीं चाहिए।"
                      : "वॉलेट का बनाया बिना साइन किया लेन-देन लाएँ। आवाज़ हर आउटपुट सहित भुगतान पढ़ता है।",
                  )}
                </p>
                {psbtFirst && state.psbtBytes && !accessible && (
                  <>
                    <p className="psbt-file-name">
                      <FileText size={18} aria-hidden="true" />
                      {state.psbtName}
                    </p>
                    <PsbtPreview
                      locale={state.locale}
                      bytes={state.psbtBytes}
                      profile={state.profile}
                      evidence={state.evidence}
                      quiet={quiet}
                      onRead={(text) =>
                        read(
                          {
                            title: "",
                            instruction: "",
                            details: [],
                            speech: text,
                          },
                          state.locale,
                        )
                      }
                    />
                    {missingProof}
                    <a
                      href="#intent"
                      className="psbt-continue"
                      onClick={() => setComparisonOpen(true)}
                    >
                      {t(
                        "Now compare with your intended payment",
                        "अब देखें: क्या आप यही भुगतान चाहते हैं?",
                      )}
                      <ArrowRight size={20} aria-hidden="true" />
                    </a>
                  </>
                )}
                <ImportControls
                  className={
                    psbtFirst && state.psbtBytes
                      ? "file-import-options"
                      : "import-controls"
                  }
                  open={psbtFirst ? !state.psbtBytes : undefined}
                >
                  {psbtFirst && state.psbtBytes && (
                    <summary>
                      {state.psbtBytes
                        ? t(
                            "Change the file or see import options",
                            "फ़ाइल बदलें या दूसरे तरीके देखें",
                          )
                        : t(
                            "Choose a file or try an example",
                            "फ़ाइल चुनें या उदाहरण देखें",
                          )}
                    </summary>
                  )}
                  <div className="upload-zone">
                    <span className="upload-icon">
                      <Upload size={24} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div>
                      <label htmlFor="psbt-file">
                        {t("Choose a PSBT file", "PSBT फ़ाइल चुनें")}
                      </label>
                      <p>
                        {t(
                          "Unsigned PSBT v0 · binary or Base64 · up to 100 KB",
                          "बिना साइन किया PSBT v0 · बाइनरी या Base64 · अधिकतम 100 KB",
                        )}
                      </p>
                      <input
                        key={"psbt-" + state.sessionId}
                        id="psbt-file"
                        type="file"
                        accept=".psbt,.txt"
                        onChange={(e) => {
                          void loadFile(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  </div>
                  {psbtFirst && !state.psbtBytes && (
                    <button
                      className="button sample-psbt"
                      type="button"
                      onClick={() => loadDemo("correct")}
                    >
                      {t(
                        "Try a 50,000 sats example",
                        "उदाहरण देखें: 50,000 सैट्स का भुगतान",
                      )}
                      <ArrowRight size={18} aria-hidden="true" />
                    </button>
                  )}
                  {state.psbtBytes && (
                    <div className="loaded-file">
                      <FileText size={16} aria-hidden="true" />
                      <span>{state.psbtName}</span>
                      <small>
                        {state.psbtBytes.length.toLocaleString("en-IN")} bytes
                      </small>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          setPsbtText("");
                          mutate({ type: "EDIT_PSBT" });
                        }}
                      >
                        {t("Remove", "हटाएँ")}
                      </button>
                    </div>
                  )}
                  <details className="paste-disclosure">
                    <summary>
                      {t(
                        "Or paste Base64 transaction data",
                        "या Base64 लेन-देन का डेटा पेस्ट करें",
                      )}
                    </summary>
                    <div>
                      <label htmlFor="psbt-paste">
                        {t("Base64 PSBT", "Base64 PSBT")}
                      </label>
                      <textarea
                        id="psbt-paste"
                        className="mono"
                        value={psbtText}
                        rows={4}
                        maxLength={201024}
                        onChange={(e) => {
                          setPsbtText(e.target.value);
                          mutate({ type: "EDIT_PSBT" });
                        }}
                        spellCheck={false}
                      />
                      <button
                        className="button secondary small"
                        type="button"
                        onClick={importPaste}
                        disabled={!psbtText.trim()}
                      >
                        {t("Load pasted PSBT", "पेस्ट किया PSBT लोड करें")}
                      </button>
                    </div>
                  </details>
                  <details className="evidence-disclosure">
                    <summary>
                      {t(
                        "Add previous transaction evidence",
                        "पिछले लेन-देन का प्रमाण जोड़ें",
                      )}
                      <span className="source-tag">
                        {state.evidence.previousTransactions.length ||
                          t("If missing", "ज़रूरत पर")}
                      </span>
                    </summary>
                    <div>
                      {missingProof}
                      <p className="muted">
                        {t(
                          "For each input, Awaaz needs the raw previous transaction linked to its transaction hash. If your PSBT already includes it, no extra file is needed.",
                          "हर इनपुट के लिए उसके हैश से जुड़ा पिछला लेन-देन चाहिए। PSBT में यह मौजूद है तो अलग फ़ाइल की ज़रूरत नहीं।",
                        )}
                      </p>
                      <label htmlFor="evidence-files">
                        {t(
                          "Previous transactions (raw binary or hex)",
                          "पिछले लेन-देन (बाइनरी या hex)",
                        )}
                      </label>
                      <input
                        key={"evidence-" + state.sessionId}
                        id="evidence-files"
                        type="file"
                        multiple
                        accept=".hex,.txn,.txt,.bin"
                        onChange={(e) => {
                          void loadEvidence(e.target.files);
                          e.target.value = "";
                        }}
                      />
                      <p className="fine-print">
                        {t(
                          "1 MB per file, 5 MB total. Replaces the evidence selection.",
                          "प्रत्येक फ़ाइल 1 MB, कुल 5 MB। पिछला चयन बदल जाएगा।",
                        )}
                      </p>
                      {state.evidence.previousTransactions.length > 0 && (
                        <button
                          className="text-button"
                          type="button"
                          onClick={() =>
                            mutate({
                              type: "SET_EVIDENCE",
                              evidence: { previousTransactions: [] },
                            })
                          }
                        >
                          {t("Clear evidence", "प्रमाण हटाएँ")}
                        </button>
                      )}
                    </div>
                  </details>
                  <DemoOptions className="demo-scenarios">
                    {psbtFirst && (
                      <summary>{t("More examples", "और उदाहरण देखें")}</summary>
                    )}
                    <div className="demo-scenarios-title">
                      <span>{t("TRY A SCENARIO", "एक उदाहरण देखें")}</span>
                      <span>
                        {t("Synthetic · no funds", "कृत्रिम · कोई धन नहीं")}
                      </span>
                    </div>
                    <div className="scenario-grid">
                      {(
                        [
                          [
                            "correct",
                            t("Correct payment", "सही भुगतान"),
                            t("Load correct PSBT", "सही PSBT लोड करें"),
                          ],
                          [
                            "tampered",
                            t(
                              "Wrong recipient · 10×",
                              "गलत प्राप्तकर्ता · १०×",
                            ),
                            t("Load tampered PSBT", "बदला PSBT लोड करें"),
                          ],
                          [
                            "extra",
                            t("An extra payment", "अतिरिक्त भुगतान"),
                            t(
                              "Load extra payment PSBT",
                              "अतिरिक्त भुगतान PSBT लोड करें",
                            ),
                          ],
                          [
                            "high-fee",
                            t("Fee above your limit", "सीमा से अधिक शुल्क"),
                            t("Load high fee PSBT", "अधिक शुल्क PSBT लोड करें"),
                          ],
                          [
                            "missing-evidence",
                            t("Missing evidence", "अधूरा प्रमाण"),
                            t(
                              "Load missing evidence PSBT",
                              "अधूरे प्रमाण का PSBT लोड करें",
                            ),
                          ],
                          [
                            "split",
                            t("A split payment", "दो आउटपुट में भुगतान"),
                            t(
                              "Load split payment PSBT",
                              "दो आउटपुट का PSBT लोड करें",
                            ),
                          ],
                          [
                            "lookalike",
                            t("Lookalike address", "मिलता-जुलता पता"),
                            t(
                              "Load lookalike address PSBT",
                              "मिलते-जुलते पते का PSBT लोड करें",
                            ),
                          ],
                        ] as [DemoScenario, string, string][]
                      ).map(([scenario, label, name]) => (
                        <button
                          className={
                            "scenario-button " +
                            (state.psbtName === "demo-" + scenario + ".psbt"
                              ? "selected"
                              : "")
                          }
                          aria-label={name}
                          type="button"
                          key={scenario}
                          onClick={() => loadDemo(scenario)}
                        >
                          {label}
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </DemoOptions>
                  <QrImport
                    key={"tx-qr-" + state.sessionId}
                    active={
                      active &&
                      (!simpleView ||
                        (psbtFirst ? guidedStep !== 3 : guidedStep === 2))
                    }
                    interactionEpoch={interactionEpoch}
                    mode="transaction"
                    locale={state.locale}
                    onBegin={() => {
                      mutate({ type: "EDIT_PSBT" });
                      const controller = new AbortController();
                      operation.current = controller;
                      return controller.signal;
                    }}
                    onTransaction={(value) => {
                      try {
                        mutate({
                          type: "SET_PSBT",
                          bytes: fromBase64(value, state.profile.maxPsbtBytes),
                          name: "QR transaction.psbt",
                        });
                      } catch (e) {
                        mutate({ type: "EDIT_PSBT" });
                        fail(
                          e instanceof Error ? e.message : "Invalid QR PSBT.",
                        );
                      }
                    }}
                  />
                </ImportControls>
                <label className="check-label auto-read">
                  <input
                    type="checkbox"
                    checked={autoRead}
                    disabled={quiet}
                    onChange={(e) => setAutoRead(e.target.checked)}
                  />
                  <Volume2 size={15} aria-hidden="true" />
                  {t(
                    "Read my result aloud automatically",
                    "मेरा परिणाम अपने आप सुनाएँ",
                  )}
                </label>
                <button
                  className="button verify-button"
                  hidden={psbtFirst}
                  type="button"
                  disabled={!canVerify}
                  onClick={() => void verify()}
                >
                  {state.phase === "verifying" ? (
                    <LoaderCircle
                      className="spinner"
                      size={19}
                      aria-hidden="true"
                    />
                  ) : (
                    <ShieldCheck size={19} aria-hidden="true" />
                  )}
                  {state.phase === "verifying"
                    ? t("Reviewing transaction…", "लेन-देन जाँचा जा रहा है…")
                    : t("Verify transaction", "लेन-देन सत्यापित करें")}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                {!psbtFirst && !state.intent && (
                  <p className="verify-hint">
                    {t(
                      "Confirm your payment intent above to continue.",
                      "आगे बढ़ने के लिए ऊपर भुगतान निर्देश की पुष्टि करें।",
                    )}
                  </p>
                )}
                {fileBusy && (
                  <p role="status">
                    {t(
                      "Reading selected files…",
                      "चुनी फ़ाइलें पढ़ी जा रही हैं…",
                    )}
                  </p>
                )}
              </section>
            </div>
            <aside
              className="review-column"
              hidden={simpleView && guidedStep !== 3}
              aria-label={t("Transaction review", "लेन-देन की जाँच")}
            >
              <div
                ref={(el) => {
                  reportRef.current = el;
                }}
                tabIndex={-1}
                className="report-focus"
              >
                <TransactionReview
                  finalVerdict={finalVerdict}
                  aiPanel={
                    state.result &&
                    finalVerdict && (
                      <AiCheck
                        locale={state.locale}
                        codeVerdict={state.result.receipt.report.verdict}
                        finalVerdict={finalVerdict}
                        enabled={aiEnabled}
                        status={currentAi?.status}
                        review={currentAi?.data}
                        onToggle={setAiEnabled}
                      />
                    )
                  }
                  simple={simpleView}
                  quiet={quiet}
                  result={state.result}
                  localized={localized}
                  locale={state.locale}
                  onRead={() => localized && read(localized)}
                  onStop={stopAudio}
                />
                {state.result && missingProof}
              </div>
              {state.result && active && (
                <ReviewConversation
                  key={state.revision}
                  result={state.result}
                  context={state.intent?.context ?? state.context}
                  locale={state.locale}
                  consent={consent && (!simpleView || guidedStep === 3)}
                  interactionEpoch={interactionEpoch}
                  quiet={quiet}
                  onRead={read}
                />
              )}
              <details open={!simpleView} className="network-disclosure">
                <summary>
                  {t("Network details (optional)", "नेटवर्क विवरण (वैकल्पिक)")}
                </summary>
                <NetworkContext
                  key={"network-" + state.sessionId + state.locale + active}
                  locale={state.locale}
                />
              </details>
              {!simpleView && state.error && (
                <div className="error-banner" role="alert">
                  <Info size={19} aria-hidden="true" />
                  <div>
                    <strong>
                      {t("Verification is incomplete", "सत्यापन अधूरा है")}
                    </strong>
                    <p>{state.error}</p>
                  </div>
                </div>
              )}
              {state.notice && (
                <p className="invalidation-notice" role="status">
                  {t(
                    "Review invalidated. Verify the changed data again.",
                    "जाँच अमान्य हुई। बदले डेटा को फिर सत्यापित करें।",
                  )}
                </p>
              )}
              <p hidden={simpleView} className="audio-status" role="status">
                {audioStatus}
              </p>
              <div className="trust-note">
                <Headphones size={20} aria-hidden="true" />
                <div>
                  <strong>
                    {t("A review you can hear.", "जाँच, जिसे आप सुन सकें।")}
                  </strong>
                  <p>
                    {t(
                      "Written and spoken results come from the same checked facts. You can always continue without a microphone.",
                      "लिखित और बोले परिणाम एक ही जाँचे विवरण से बनते हैं। माइक्रोफ़ोन के बिना भी पूरा काम कर सकते हैं।",
                    )}
                  </p>
                </div>
              </div>
              <details className="privacy-details">
                <summary>
                  {t(
                    "What Awaaz can—and cannot—verify",
                    "आवाज़ क्या सत्यापित कर सकता है",
                  )}
                </summary>
                <p>
                  {t(
                    "Payment data stays in this browser’s memory. Reset or reload clears it. Browser speech may use a remote provider. A match checks the instruction, configured addresses and supplied previous transactions; it does not prove address ownership, chain inclusion or unspent funds. Awaaz cannot prevent another wallet from signing.",
                    "भुगतान डेटा ब्राउज़र की मेमोरी में रहता है। रीसेट या रीलोड से मिट जाता है। ब्राउज़र की आवाज़ सेवा दूरस्थ प्रदाता इस्तेमाल कर सकती है। मेल खाने का अर्थ निर्देश, पते और दिए पिछले लेन-देन से संगति है; स्वामित्व, चेन में शामिल होना या धन खर्च न होना सिद्ध नहीं होता। आवाज़ दूसरे वॉलेट को साइन करने से रोक नहीं सकता।",
                  )}
                </p>
              </details>
            </aside>
          </div>
        </main>
        <footer className="site-footer">
          <span className="footer-wordmark">
            awaaz <span lang="hi">आवाज़</span>
          </span>
          <p>
            {t(
              "Your Bitcoin. Your decision. A little more clarity.",
              "आपका बिटकॉइन। आपका निर्णय। थोड़ी और स्पष्टता।",
            )}
          </p>
          <span>
            {t(
              "Independent testnet review · v0.3",
              "स्वतंत्र टेस्टनेट जाँच · v0.3",
            )}
          </span>
        </footer>
      </div>
    </MotionConfig>
  );
}
