export const QUESTION_CATEGORIES = [
  "recipient",
  "amount",
  "fee",
  "debit",
  "change",
  "unusual",
  "limits",
  "unsupported",
] as const;
export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];
export function readQuestionCategory(value: unknown): QuestionCategory {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !("category" in value) ||
    !QUESTION_CATEGORIES.includes(value.category as QuestionCategory)
  )
    throw new Error("Invalid question category.");
  return value.category as QuestionCategory;
}
