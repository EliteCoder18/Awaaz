import { address, networks } from "bitcoinjs-lib";
import { toHex } from "./encoding";
import { validMoney } from "./verificationPolicy";
export interface PaymentRequest {
  address: string;
  scriptHex: string;
  amountSats?: bigint;
  label?: string;
  message?: string;
  identityVerified: false;
  ignoredParameters: string[];
}
export function parsePaymentRequest(input: string): PaymentRequest {
  const value = input.trim();
  if (
    !value ||
    value.length > 4096 ||
    /%(?![0-9a-f]{2})/i.test(value) ||
    value.includes("#")
  )
    throw new Error("Invalid or oversized Bitcoin payment request.");
  let recipient = value,
    params = new URLSearchParams();
  if (/^bitcoin:/i.test(value)) {
    const body = value.slice(8);
    if (body.startsWith("//"))
      throw new Error("Use bitcoin:address, without //.");
    const index = body.indexOf("?");
    recipient = decodeURIComponent(index < 0 ? body : body.slice(0, index));
    params = new URLSearchParams(index < 0 ? "" : body.slice(index + 1));
  } else if (value.includes(":") || value.includes("?"))
    throw new Error(
      "Only a public testnet address or Bitcoin URI is supported.",
    );
  const fields = new Map<string, string>();
  for (const [key, v] of params) {
    const name = key.toLowerCase();
    if (fields.has(name))
      throw new Error("Duplicate payment request parameter.");
    if (name.startsWith("req-"))
      throw new Error("Unsupported required payment request parameter.");
    fields.set(name, v);
  }
  let scriptHex: string;
  try {
    scriptHex = toHex(address.toOutputScript(recipient, networks.testnet));
  } catch {
    throw new Error(
      "The request needs a checksum-valid public testnet address.",
    );
  }
  const btc = fields.get("amount");
  let amountSats: bigint | undefined;
  if (btc !== undefined) {
    if (!/^\d+(?:\.\d{1,8})?$/.test(btc) || btc.length > 30)
      throw new Error("Request amount must be an exact positive BTC decimal.");
    const [whole, part = ""] = btc.split(".");
    amountSats = BigInt(whole) * 100000000n + BigInt(part.padEnd(8, "0"));
    if (amountSats <= 0n || !validMoney(amountSats))
      throw new Error("Request amount is outside the Bitcoin money range.");
  }
  const label = fields.get("label"),
    message = fields.get("message");
  if ((label?.length ?? 0) > 60 || (message?.length ?? 0) > 500)
    throw new Error("Request label or message is too long.");
  return {
    address: recipient,
    scriptHex,
    amountSats,
    label,
    message,
    identityVerified: false,
    ignoredParameters: [...fields.keys()].filter(
      (k) => !["amount", "label", "message"].includes(k),
    ),
  };
}
