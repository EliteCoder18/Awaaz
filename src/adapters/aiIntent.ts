import {
  readAiIntent,
  type AiContact,
  type AiIntentResponse,
} from "../core/aiContract";
import type { AddressBookEntry, Locale } from "../core/types";
import { postAiJson } from "./aiClient";

export async function requestAiIntent(
  transcript: string,
  locale: Locale,
  addressBook: AddressBookEntry[],
  signal: AbortSignal,
): Promise<AiIntentResponse> {
  const contacts: AiContact[] = addressBook.slice(0, 20).map((e) => ({
    id: e.id.slice(0, 64),
    displayName: e.displayName.slice(0, 64),
    aliases: e.aliases.slice(0, 10).map((a) => a.slice(0, 64)),
  }));
  return readAiIntent(
    await postAiJson(
      "/api/ai/intent",
      { transcript: transcript.slice(0, 500), locale, contacts },
      signal,
      15000,
    ),
    contacts,
  );
}
