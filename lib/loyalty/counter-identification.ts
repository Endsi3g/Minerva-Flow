export type CounterPhoneMatch = {
  id: string;
  name: string;
  phone: string | null;
};

/**
 * Prefer a unique full-number match. If only suffix matches are available,
 * require a single candidate instead of silently crediting the wrong account.
 */
export function selectCounterPhoneMatch(
  matches: CounterPhoneMatch[],
  query: string
): { match: CounterPhoneMatch | null; ambiguous: boolean } {
  const digits = query.replace(/\D/g, "");
  const exactMatches = matches.filter((candidate) => candidate.phone?.replace(/\D/g, "") === digits);

  if (exactMatches.length === 1) return { match: exactMatches[0], ambiguous: false };
  if (exactMatches.length > 1) return { match: null, ambiguous: true };
  if (matches.length === 1) return { match: matches[0], ambiguous: false };
  return { match: null, ambiguous: matches.length > 1 };
}
