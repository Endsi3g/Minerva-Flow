import { roundToCents } from "@/lib/utils";

export type OrderPricingInput = {
  cart: { menuItemId: string; quantity: number }[];
  menuItemById: Map<string, { id: string; name: string; price: number }>;
  taxRate: number;
  acceptsTips: boolean;
  requestedTipAmount: number;
};

export type OrderPricingLineItem = {
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
};

export type OrderPricingResult = {
  lineItems: OrderPricingLineItem[];
  subtotal: number;
  taxAmount: number;
  tipAmount: number;
  total: number;
};

/**
 * The single place that turns a client-submitted cart into trusted dollar
 * amounts, using only server-known menu prices — never the client's own
 * numbers. Shared by the pay-on-site and pay-online order paths in
 * lib/data/customer-referrals.ts so they can't diverge. Returns null when
 * the cart has no valid lines after filtering (empty cart, all items
 * inactive/deleted since the page loaded, or garbage quantities).
 */
export function computeOrderPricing(input: OrderPricingInput): OrderPricingResult | null {
  const lineItems = input.cart
    .map((line) => {
      const item = input.menuItemById.get(line.menuItemId);
      if (!item || !Number.isFinite(line.quantity) || line.quantity <= 0) return null;
      return { menuItemId: item.id, itemName: item.name, unitPrice: item.price, quantity: line.quantity };
    })
    .filter((l): l is OrderPricingLineItem => l !== null);

  if (lineItems.length === 0) return null;

  const subtotal = lineItems.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const taxAmount = roundToCents(subtotal * input.taxRate);
  const tipAmount =
    input.acceptsTips && Number.isFinite(input.requestedTipAmount) ? Math.max(0, input.requestedTipAmount) : 0;
  const total = subtotal + taxAmount + tipAmount;

  return { lineItems, subtotal, taxAmount, tipAmount, total };
}
