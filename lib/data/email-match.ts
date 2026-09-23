/**
 * PostgREST's `ilike` value is a SQL LIKE pattern (`%` and `_` are wildcards;
 * `*` is also accepted as an alias for `%`). When one appears in an email,
 * use equality instead so user-controlled addresses can never match another
 * customer's identity record by pattern.
 */
export function emailMatchOperator(email: string): "eq" | "ilike" {
  return /[%_*\\]/.test(email) ? "eq" : "ilike";
}
