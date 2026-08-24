// Mirrors DEMO_EMAIL in scripts/seed-demo-account.mjs — duplicated rather
// than imported because that script is a standalone Node entrypoint outside
// the Next.js app graph.
export const DEMO_ACCOUNT_EMAIL = "demo@minervaflow.app";

export function isDemoAccount(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEMO_ACCOUNT_EMAIL;
}
