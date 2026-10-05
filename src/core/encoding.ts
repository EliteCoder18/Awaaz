export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
export function fromHex(hex: string): Uint8Array {
  if (!/^(?:[a-f\d]{2})+$/i.test(hex))
    throw new Error("Invalid hexadecimal data.");
  return Uint8Array.from(hex.match(/../g)!, (byte) => parseInt(byte, 16));
}
export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 16_384)
    binary += String.fromCharCode(...bytes.subarray(i, i + 16_384));
  return btoa(binary);
}
export function fromBase64(value: string, maxBytes = 100_000): Uint8Array {
  if (value.length > maxBytes * 2 + 1024)
    throw new Error("PSBT exceeds the size limit.");
  const compact = value.replace(/\s/g, "");
  if (
    !compact ||
    compact.length % 4 !== 0 ||
    !/^[A-Za-z\d+/]*={0,2}$/.test(compact)
  )
    throw new Error("Invalid Base64 data.");
  const binary = atob(compact);
  if (binary.length > maxBytes) throw new Error("PSBT exceeds the size limit.");
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  if (toBase64(bytes) !== compact)
    throw new Error("Non-canonical Base64 data.");
  return bytes;
}
