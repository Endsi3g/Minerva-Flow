export type AuditCheckId =
  | "https"
  | "speed"
  | "mobileViewport"
  | "seoBasics"
  | "onlineMenu"
  | "onlineOrdering"
  | "onlineReservation"
  | "clickablePhone"
  | "socialLinks";

export type AuditCheck = {
  id: AuditCheckId;
  passed: boolean;
  /** Free-form detail shown next to the check, e.g. "842 ms" or the matched host. */
  detail?: string;
};

export type WebsiteAuditReport = {
  url: string;
  fetchedAt: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  checks: AuditCheck[];
  /** Set when the target site couldn't be reached at all — every check below reflects that. */
  siteUnreachable?: boolean;
};
