export const CONVERSATION_TOPICS = [
  "overview", "recipient", "amount", "fee", "debit", "change", "unusual",
  "limits", "fee_comparison", "confirmation", "savings", "replaceability",
  "signing", "unsupported",
] as const;
export type ConversationTopic = (typeof CONVERSATION_TOPICS)[number];
export interface ConversationPlan { topics: ConversationTopic[] }
export interface ConversationRequest {
  question: string;
  locale: "en-IN" | "hi-IN";
  previousQuestion: string;
  previousTopics: ConversationTopic[];
}
export function readConversationPlan(value: unknown): ConversationPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== 1 || !("topics" in value)
    || !Array.isArray(value.topics) || !value.topics.length || value.topics.length > 4
    || value.topics.some((topic) => !CONVERSATION_TOPICS.includes(topic as ConversationTopic)))
    throw new Error("Invalid conversation topics.");
  const topics = [...new Set(value.topics)] as ConversationTopic[];
  if (topics.includes("unsupported") && topics.length !== 1)
    throw new Error("Unsupported topics cannot be mixed with transaction answers.");
  return { topics };
}
export function readConversationRequest(value: unknown): ConversationRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== 4) throw new Error("Invalid conversation request.");
  const data = value as Record<string, unknown>;
  if (typeof data.question !== "string" || !data.question.trim() || data.question.length > 500
    || !["en-IN", "hi-IN"].includes(String(data.locale))
    || typeof data.previousQuestion !== "string" || data.previousQuestion.length > 500
    || !Array.isArray(data.previousTopics) || data.previousTopics.length > 4
    || data.previousTopics.some((topic) => !CONVERSATION_TOPICS.includes(topic as ConversationTopic)))
    throw new Error("Invalid conversation request.");
  return data as unknown as ConversationRequest;
}

/** Local routing is available without an API key or network connection. */
export function localConversationPlan(question: string): ConversationPlan {
  const q = question.toLowerCase();
  const topics: ConversationTopic[] = [];
  const add = (topic: ConversationTopic) => { if (!topics.includes(topic)) topics.push(topic); };
  if (/\bsafe(?:ty)?\b|okay.*sign|should.*sign|सुरक्षित|सुरक्षा|identity|ownership|पहचान|guarantee|verify.*not|can.?t.*verify/.test(q)) add("limits");
  if (/how.*long|when.*(?:confirm|settle|arriv)|confirm.*time|settle|confirmation|कब|कितना समय|पुष्टि|पहुंच|pahunch|kitna.*time|kab/.test(q)) add("confirmation");
  if (/too.*(?:high|expensive)|expensive|overpay|reasonable|fee.*high|high.*fee|महंगा|महँगा|ज़्यादा|ज्यादा|mehenga|zyada/.test(q)) add("fee_comparison");
  if (/save|cheaper|lower|reduce|wait|slow|बचत|कम.*(?:शुल्क|फीस)|सस्ता|इंतज़ार|sasta|kam.*fee/.test(q)) add("savings");
  if (/replace|rbf|bump|speed.*up|तेज़|तेज/.test(q)) add("replaceability");
  if (/what.*sign|explain.*(?:this|transaction|payment)|what.*(?:transaction|payment).*do|overview|क्या.*साइन|समझाओ|samjhao/.test(q)) add("overview");
  if (/unusual|wrong|risk|warning|असामान्य|गलत|जोखिम|चेतावनी/.test(q)) add("unusual");
  if (/\bchange\b|चेंज|वापस/.test(q)) add("change");
  if (/\b(?:leave|leaves|debit|total|spend|spent)\b|कुल|बाहर|कटेंगे/.test(q)) add("debit");
  if (/recipient|receiv|\bwho\b|किसे|प्राप्तकर्ता/.test(q)) add("recipient");
  if (/\b(?:fee|fees|cost|miners?)\b|शुल्क|फीस|माइनर/.test(q) && !topics.some((topic) => ["fee_comparison", "savings"].includes(topic))) add("fee");
  if (/\b(?:amount|payment|send|sending)\b|राशि|भुगतान|भेज/.test(q) && !topics.includes("overview")) add("amount");
  if (/what.*signing|signing.*mean|broadcast|साइन.*मतलब|प्रसारण/.test(q)) add("signing");
  return { topics: topics.length ? topics.slice(0, 4) : ["unsupported"] };
}
