/** PostgREST to-one relations are objects; schema-less clients may infer arrays. */
export function firstJoinedRow<T>(value: T | readonly T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value as T;
}
