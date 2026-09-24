/** Next.js may abort an RSC render after the browser navigates away. */
export function isExpectedClientDisconnect(error: unknown): boolean {
  return error instanceof Error && error.message === "The destination stream closed early.";
}
