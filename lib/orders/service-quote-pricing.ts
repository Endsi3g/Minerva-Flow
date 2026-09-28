export type ServiceQuotePricingLine = { quantity: number; unitPrice: number };
export type ServiceQuoteIssueLine = {
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
};
export type ServiceQuoteTotals = { subtotal: number; taxAmount: number; total: number; depositAmount: number };

function cents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Reject invalid or over-limit input instead of silently changing what the owner priced. */
export function normalizeServiceQuoteLines(input: unknown): ServiceQuoteIssueLine[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) return null;

  const normalized: ServiceQuoteIssueLine[] = [];
  for (const candidate of input) {
    if (!candidate || typeof candidate !== "object") return null;
    const line = candidate as Record<string, unknown>;
    if (typeof line.name !== "string" || typeof line.quantity !== "number" || !Number.isInteger(line.quantity)
      || (line.quantity as number) < 1 || (line.quantity as number) > 10_000
      || typeof line.unitPrice !== "number" || !Number.isFinite(line.unitPrice)
      || line.unitPrice < 0 || line.unitPrice > 100_000) return null;

    const name = line.name.trim().replace(/\s+/g, " ");
    if (name.length < 1 || name.length > 120) return null;

    let description: string | null = null;
    if (line.description != null) {
      if (typeof line.description !== "string") return null;
      description = line.description.trim().replace(/\s+/g, " ") || null;
      if (description && description.length > 500) return null;
    }

    const roundedUnitPrice = cents(line.unitPrice);
    if (Math.abs(line.unitPrice - roundedUnitPrice) > 1e-7) return null;
    normalized.push({
      name,
      description,
      quantity: line.quantity as number,
      unitPrice: roundedUnitPrice,
    });
  }
  return normalized;
}

/** Mirrors the authoritative bounds in issue_service_quote, for fast feedback and tests. */
export function calculateServiceQuoteTotals(
  lines: ServiceQuotePricingLine[],
  taxRate: number,
  depositPercent: number
): ServiceQuoteTotals | null {
  if (!lines.length || lines.length > 50 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 0.3
    || !Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100) return null;
  if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10_000
    || !Number.isFinite(line.unitPrice) || line.unitPrice < 0 || line.unitPrice > 100_000)) return null;
  const subtotal = cents(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  if (!Number.isFinite(subtotal) || subtotal > 99_999_999.99) return null;
  const taxAmount = cents(subtotal * taxRate);
  const total = cents(subtotal + taxAmount);
  if (!Number.isFinite(taxAmount) || !Number.isFinite(total) || total > 99_999_999.99) return null;
  const depositAmount = cents(total * depositPercent / 100);
  if (depositAmount < 0.5) return null;
  return { subtotal, taxAmount, total, depositAmount };
}
