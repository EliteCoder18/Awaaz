import { address, networks } from "bitcoinjs-lib";
import { toHex } from "./encoding";
import type { WalletProfile } from "./types";
export interface ProfileInput {
  recipients: {
    id: string;
    name: string;
    aliases: string[];
    address: string;
  }[];
  changeAddresses: string[];
  source: "demo" | "user-reviewed";
  revision: number;
}
export function createWalletProfile(input: ProfileInput): WalletProfile {
  if (
    !input.recipients.length ||
    input.recipients.length > 20 ||
    input.changeAddresses.length > 100
  )
    throw new Error(
      "Configure 1–20 recipients and at most 100 change addresses.",
    );
  const aliases = new Set<string>(),
    ids = new Set<string>(),
    scripts = new Set<string>();
  const scriptFor = (a: string) => {
    if (!/^(tb1|[mn2])/.test(a.trim()) || a.length > 120)
      throw new Error(
        "Enter a checksum-valid testnet address. Never enter a seed or private key.",
      );
    try {
      return toHex(address.toOutputScript(a.trim(), networks.testnet));
    } catch {
      throw new Error("The testnet address checksum or format is invalid.");
    }
  };
  const addressBook = input.recipients.map((r) => {
    if (
      !r.id.trim() ||
      ids.has(r.id) ||
      !r.name.trim() ||
      r.name.length > 60 ||
      !r.aliases.length
    )
      throw new Error("Recipients need unique IDs, names and aliases.");
    ids.add(r.id);
    for (const a of r.aliases) {
      const key = a.normalize("NFC").toLowerCase().trim();
      if (!key || key.length > 60 || aliases.has(key))
        throw new Error("Recipient aliases must be unique.");
      aliases.add(key);
    }
    const script = scriptFor(r.address);
    if (scripts.has(script))
      throw new Error("Recipient addresses must be unique.");
    scripts.add(script);
    return {
      id: r.id,
      displayName: r.name.trim(),
      aliases: r.aliases.map((a) => a.trim()),
      address: r.address.trim(),
      scriptHexes: [script],
    };
  });
  const knownChangeScriptHexes = input.changeAddresses.map(scriptFor);
  if (
    new Set(knownChangeScriptHexes).size !== knownChangeScriptHexes.length ||
    knownChangeScriptHexes.some((s) => scripts.has(s))
  )
    throw new Error(
      "Change addresses must be unique and different from recipients.",
    );
  return {
    networkContext: "testnet",
    addressBook,
    knownChangeScriptHexes,
    changeAddresses: input.changeAddresses.map((a) => a.trim()),
    maxPsbtBytes: 100_000,
    source: input.source,
    revision: input.revision,
  };
}
