import type { FeeContext } from "../adapters/feeContext";
import type { ConversationPlan, ConversationTopic } from "./conversationTopics";
import type { Locale, PaymentContext, ReviewResult, TransactionFacts } from "./types";
import { presentReport } from "./reportPresenter";
import { assessPaymentContext } from "./paymentContext";

export interface TransactionAnswer {
  topics: ConversationTopic[];
  paragraphs: string[];
  usesNetwork: boolean;
}
export function answerTransaction({ plan, facts, result, context, locale, fees, now = Date.now() }: {
  plan: ConversationPlan;
  facts: TransactionFacts;
  result?: ReviewResult;
  context: PaymentContext;
  locale: Locale;
  fees?: FeeContext;
  now?: number;
}): TransactionAnswer {
  const t = (en: string, hi: string) => locale === "hi-IN" ? hi : en;
  const fmt = (n: bigint) => n.toLocaleString("en-IN");
  const payments = facts.outputs.filter((o) => o.valueSats > 0n && o.classification !== "change");
  const amount = payments.reduce((sum, o) => sum + o.valueSats, 0n);
  const change = facts.outputs.filter((o) => o.classification === "change").reduce((sum, o) => sum + o.valueSats, 0n);
  const fee = facts.evidenceComplete ? facts.feeSats : undefined;
  const size = facts.estimatedSignedVsize;
  const rate = fee !== undefined && size && size > 0 ? Number(fee) / size : undefined;
  const fresh = fees && now >= fees.fetchedAt && now - fees.fetchedAt < 300_000;
  const networkTopics = ["fee_comparison", "confirmation", "savings"];
  const missingNetwork = t(
    "Turn on public mempool fee estimates in conversation settings, then ask again. I need a fresh network snapshot to compare fees or estimate confirmation priority. No transaction is uploaded.",
    "संवाद सेटिंग में सार्वजनिक mempool शुल्क अनुमान चालू करें, फिर पूछें। शुल्क तुलना और पुष्टि की प्राथमिकता के लिए ताज़ा नेटवर्क जानकारी चाहिए। लेन-देन अपलोड नहीं होता।",
  );
  const missingRate = t(
    "I cannot estimate this transaction’s fee rate without complete input evidence and supported P2WPKH inputs. Bring the previous-transaction evidence from your wallet; I won’t guess.",
    "सभी इनपुट प्रमाण और समर्थित P2WPKH इनपुट बिना इस लेन-देन की शुल्क दर नहीं निकाल सकता। वॉलेट से पिछले लेन-देन का प्रमाण लाएँ; मैं अनुमान लगाकर तथ्य नहीं बताऊँगा।",
  );
  const approximateRate = rate === undefined ? missingRate : t(
    `Your fee is ${fmt(fee!)} sats, approximately ${rate.toFixed(2)} sat/vB using a conservative ${size}-vB signed-size estimate. The final signature size can change this rate slightly.`,
    `शुल्क ${fmt(fee!)} सैट्स है, ${size} vB के सावधानीपूर्ण साइन-आकार अनुमान से लगभग ${rate.toFixed(2)} sat/vB। अंतिम हस्ताक्षर का आकार दर थोड़ी बदल सकता है।`,
  );
  const destinations = payments.slice(0, 5).map((o) => `${fmt(o.valueSats)} sats → ${o.displayAddress ?? o.scriptHex}`).join("; ");
  const extra = payments.length > 5 ? t(` Plus ${payments.length - 5} more destinations in the output list.`, ` आउटपुट सूची में ${payments.length - 5} और पते हैं।`) : "";
  const paragraphs = plan.topics.map((topic): string => {
    if (!facts.outputs.length && !["limits", "signing", "unsupported"].includes(topic))
      return t("I cannot read supported payment facts from this file. Resolve the file error or unsupported PSBT version before asking about amounts or timing. Do not sign.", "इस फ़ाइल से समर्थित भुगतान तथ्य नहीं पढ़ सकता। राशि या समय पूछने से पहले फ़ाइल की त्रुटि या असमर्थित PSBT संस्करण ठीक करें। साइन न करें।");
    switch (topic) {
      case "overview": return t(
        `This file sends ${fmt(amount)} sats to ${payments.length} external destination(s), returns ${fmt(change)} sats to configured change, and pays ${fee === undefined ? "an unknown" : fmt(fee) + "-sat"} network fee. Nothing has been signed or sent by Awaaz.`,
        `यह फ़ाइल ${payments.length} बाहरी पते पर ${fmt(amount)} सैट्स भेजती है, कॉन्फ़िगर किए चेंज पर ${fmt(change)} सैट्स लौटाती है और ${fee === undefined ? "अज्ञात" : fmt(fee) + " सैट्स"} नेटवर्क शुल्क देती है। आवाज़ ने साइन या भुगतान नहीं किया।`,
      );
      case "recipient": return t(`Actual payment destinations: ${destinations || "none"}. Names do not prove who owns an address.`, `वास्तविक भुगतान पते: ${destinations || "कोई नहीं"}। नाम पते के मालिक का प्रमाण नहीं है।`) + extra;
      case "amount": return t(`The external payment total is ${fmt(amount)} sats, excluding the fee.`, `बाहरी भुगतान का कुल ${fmt(amount)} सैट्स है, शुल्क अलग है।`);
      case "debit": return fee === undefined ? t("The total leaving your wallet is unknown because the fee is not fully evidenced.", "शुल्क का पूरा प्रमाण न होने से वॉलेट से निकलने वाला कुल अज्ञात है।") : t(`The total leaving your wallet is ${fmt(amount + fee)} sats: ${fmt(amount)} in payments plus ${fmt(fee)} in fees. Configured change is separate.`, `वॉलेट से कुल ${fmt(amount + fee)} सैट्स निकलेंगे: ${fmt(amount)} भुगतान और ${fmt(fee)} शुल्क। कॉन्फ़िगर किया चेंज अलग है।`);
      case "change": return t(`Configured change is ${fmt(change)} sats. This matches your configured scripts; it does not prove ownership.`, `कॉन्फ़िगर किया चेंज ${fmt(change)} सैट्स है। यह आपकी स्क्रिप्ट से मेल है, स्वामित्व का प्रमाण नहीं।`);
      case "fee": return approximateRate;
      case "unusual": {
        const notices = assessPaymentContext(context, locale).map((n) => n.text);
        if (result) {
          const report = presentReport(result.receipt.report, locale);
          return [report.title, report.instruction, ...report.details, ...notices].join(" ");
        }
        return [t("The file has not been compared with a confirmed payment instruction yet. Do not sign.", "फ़ाइल का पुष्टि किए भुगतान निर्देश से मेल अभी नहीं जाँचा गया। साइन न करें।"), ...facts.warnings.map((w) => w.detail), ...notices].join(" ");
      }
      case "limits": return t("I cannot approve signing or prove recipient identity, ownership, unspent inputs, chain inclusion or safety. MATCH only means consistency with your confirmed instruction. Confirmation estimates are not guarantees.", "मैं साइन की अनुमति या पहचान, स्वामित्व, इनपुट के अभी खर्च न होने, चेन में शामिल होने या सुरक्षा का प्रमाण नहीं दे सकता। MATCH केवल पुष्टि किए निर्देश से मेल है। पुष्टि के अनुमान गारंटी नहीं हैं।");
      case "fee_comparison": {
        if (!fresh) return missingNetwork;
        if (rate === undefined) return missingRate;
        const comparison = rate > fees!.fastestFee * 2 && fees!.fastestFee > 0
          ? t("Your estimated rate is more than twice the current fastest recommendation. That may be more than needed; it does not buy guaranteed confirmation.", "अनुमानित दर मौजूदा सबसे तेज़ सिफारिश के दोगुने से अधिक है। यह ज़रूरत से ज़्यादा हो सकती है; पुष्टि की गारंटी नहीं मिलती।")
          : rate >= fees!.fastestFee
            ? t("Your estimated rate meets or exceeds the current fastest recommendation. Whether it is worth paying depends on how urgently you need confirmation.", "अनुमानित दर मौजूदा सबसे तेज़ सिफारिश के बराबर या अधिक है। इतना शुल्क देना आपकी जल्दी पर निर्भर है।")
            : t("Your estimated rate is below the current fastest recommendation. Compare the slower targets if you can wait.", "अनुमानित दर मौजूदा सबसे तेज़ सिफारिश से कम है। इंतज़ार कर सकते हैं तो धीमे विकल्प देखें।");
        const cap = result?.receipt.report.speakableParameters.maxFee;
        return `${approximateRate} ${comparison} ` + t(`Current testnet3 targets: fast ${fees!.fastestFee}, half-hour ${fees!.halfHourFee}, hour ${fees!.hourFee}, economy ${fees!.economyFee} sat/vB.`, `मौजूदा testnet3 लक्ष्य: तेज़ ${fees!.fastestFee}, आधा घंटा ${fees!.halfHourFee}, घंटा ${fees!.hourFee}, किफ़ायती ${fees!.economyFee} sat/vB।`) + (cap && /^\d+$/.test(cap) ? t(` Your confirmed fee cap is ${fmt(BigInt(cap))} sats${fee! > BigInt(cap) ? "; this transaction exceeds it. Do not sign." : "."}`, ` आपकी पुष्टि की शुल्क सीमा ${fmt(BigInt(cap))} सैट्स है${fee! > BigInt(cap) ? "; यह लेन-देन उससे अधिक है। साइन न करें।" : "।"}`) : "");
      }
      case "confirmation": {
        if (!fresh) return missingNetwork;
        if (rate === undefined) return missingRate;
        if (facts.locktime || facts.warnings.some((w) => w.code.startsWith("UNSUPPORTED_")))
          return t("A timelock or unsupported transaction rule prevents a useful confirmation estimate. Resolve it in your wallet first.", "टाइमलॉक या असमर्थित नियम के कारण उपयोगी पुष्टि अनुमान नहीं दिया जा सकता। पहले वॉलेट में इसे स्पष्ट करें।");
        const bracket = rate >= fees!.fastestFee ? t("the provider’s fastest target, aiming for an upcoming block", "प्रदाता का तेज़ लक्ष्य, आगामी ब्लॉक का प्रयास")
          : rate >= fees!.halfHourFee ? t("the provider’s roughly half-hour target", "प्रदाता का लगभग आधे घंटे वाला लक्ष्य")
          : rate >= fees!.hourFee ? t("the provider’s roughly one-hour target", "प्रदाता का लगभग एक घंटे वाला लक्ष्य")
          : t("a lower-priority queue, with no reliable time estimate", "कम प्राथमिकता की कतार, जिसका भरोसेमंद समय अनुमान नहीं है");
        return t(`At approximately ${rate.toFixed(2)} sat/vB, your payment fits ${bracket}. This is a fee-priority heuristic, not a transaction simulation. The clock starts only after your wallet broadcasts; Awaaz has not broadcast it. Testnet3 block times vary greatly. First confirmation is not final settlement; recipients can require more confirmations, and congestion or unconfirmed parents can delay it.`, `लगभग ${rate.toFixed(2)} sat/vB पर भुगतान ${bracket} में आता है। यह शुल्क-प्राथमिकता का मोटा अनुमान है, लेन-देन का सिमुलेशन नहीं। समय वॉलेट से प्रसारण के बाद शुरू होता है; आवाज़ ने प्रसारण नहीं किया। testnet3 में ब्लॉक समय बहुत बदलता है। पहली पुष्टि अंतिम निपटान नहीं है; प्राप्तकर्ता अधिक पुष्टियाँ माँग सकता है और भीड़ या अपुष्ट पिछले लेन-देन देरी कर सकते हैं।`);
      }
      case "savings": {
        if (!fresh) return missingNetwork;
        if (rate === undefined) return missingRate;
        const target = BigInt(Math.ceil(fees!.hourFee * size!));
        const saving = fee! > target ? fee! - target : 0n;
        return t(`If you can wait, the current hour target (${fees!.hourFee} sat/vB) suggests about ${fmt(target)} sats for this estimated size. Potential saving versus your file: ${fmt(saving)} sats. The economy target is ${fees!.economyFee} sat/vB and has no reliable deadline. These are estimates, not a minimum valid fee. Rebuild the payment in your wallet and review the new PSBT; I do not edit fees or send money.`, `इंतज़ार कर सकते हैं तो मौजूदा घंटे वाला लक्ष्य (${fees!.hourFee} sat/vB) इस अनुमानित आकार पर लगभग ${fmt(target)} सैट्स सुझाता है। फ़ाइल के मुकाबले संभावित बचत ${fmt(saving)} सैट्स है। किफ़ायती लक्ष्य ${fees!.economyFee} sat/vB है, उसकी भरोसेमंद समय सीमा नहीं। ये अनुमान हैं, न्यूनतम वैध शुल्क नहीं। वॉलेट में भुगतान फिर बनाएँ और नई PSBT जाँचें; मैं शुल्क बदलता या धन भेजता नहीं।`);
      }
      case "replaceability": return facts.replaceable === undefined ? t("Replaceability could not be determined.", "शुल्क बढ़ाने की सुविधा पता नहीं चल सकी।") : facts.replaceable ? t("The file signals opt-in replace-by-fee. Your wallet may let you increase the fee after broadcasting, subject to its support and network policy. This does not guarantee a successful replacement.", "फ़ाइल opt-in replace-by-fee का संकेत देती है। वॉलेट और नेटवर्क नियमों के अनुसार प्रसारण के बाद शुल्क बढ़ाने का विकल्प मिल सकता है। बदलाव सफल होने की गारंटी नहीं।") : t("This file does not signal opt-in replace-by-fee. Other fee-bump options depend on wallet support, change ownership and network policy; I cannot promise they will be available.", "फ़ाइल opt-in replace-by-fee का संकेत नहीं देती। दूसरे विकल्प वॉलेट, चेंज के स्वामित्व और नेटवर्क नियमों पर निर्भर हैं; उपलब्ध होने की गारंटी नहीं।");
      case "signing": return t("Signing authorizes the transaction described by your wallet’s signing rules. Broadcasting sends it to the Bitcoin network; first confirmation means inclusion in a block. Awaaz performs none of these steps. Check the actual wallet screen and independently confirm addresses.", "साइन करना वॉलेट के साइन नियमों के अनुसार लेन-देन को अनुमति देता है। प्रसारण नेटवर्क पर भेजता है; पहली पुष्टि ब्लॉक में शामिल होना है। आवाज़ इनमें से कोई कदम नहीं करता। वॉलेट की असली स्क्रीन और पते स्वतंत्र रूप से जाँचें।");
      default: return t("I can explain this file, payments, fees, confirmation estimates, change and fee-bump options. Tell me which detail you mean. I cannot invent transaction facts or answer price predictions.", "मैं फ़ाइल, भुगतान, शुल्क, पुष्टि अनुमान, चेंज और शुल्क बढ़ाने के विकल्प समझा सकता हूँ। बताएँ किस विवरण के बारे में पूछ रहे हैं। मैं लेन-देन के तथ्य बना या कीमत का अनुमान नहीं दे सकता।");
    }
  });
  return { topics: plan.topics, paragraphs: [...new Set(paragraphs)], usesNetwork: !!fresh && plan.topics.some((topic) => networkTopics.includes(topic)) };
}
