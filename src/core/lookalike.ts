// Address poisoning: an attacker's address that starts (and often ends) like
// one you trust. People usually compare only the first or last characters.
export function looksAlike(candidate: string, known: string): boolean {
  const a = candidate.toLowerCase(),
    b = known.toLowerCase();
  if (!a || !b || a === b) return false;
  let prefix = 0;
  while (prefix < Math.min(a.length, b.length) && a[prefix] === b[prefix])
    prefix++;
  let suffix = 0;
  while (
    suffix < Math.min(a.length, b.length) - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  )
    suffix++;
  // Long shared start, or matching start and end with a different middle.
  return prefix >= 10 || (prefix >= 7 && suffix >= 4);
}

export function findLookalike(
  candidate: string,
  known: { name: string; address: string }[],
): { name: string; address: string } | undefined {
  return known.find((k) => looksAlike(candidate, k.address));
}
