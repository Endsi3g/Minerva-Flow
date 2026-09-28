import { roundToCents } from "@/lib/utils";
import { findMenuPriceOption } from "@/lib/menu-pricing";
import type { MenuPriceOption } from "@/lib/types";

const MAX_DATABASE_MONEY = 99_999_999.99;
const MAX_POSTGRES_INTEGER = 2_147_483_647;

export type OrderPricingInput = {
  cart: { menuItemId: string; quantity: number; priceOptionId?: string | null }[];
  menuItemById: Map<string, { id: string; name: string; price: number; priceOptions?: MenuPriceOption[] }>;
  taxRate: number;
  acceptsTips: boolean;
  requestedTipAmount: number;
};

export type OrderPricingLineItem = {
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  priceOptionId: string | null;
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
 * any requested line is stale/malformed; silently dropping a line could
 * create and charge a different order than the customer submitted.
 */
export function computeOrderPricing(input: OrderPricingInput): OrderPricingResult | null {
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 1) return null;

  const lineItems = input.cart
    .map((line) => {
      const item = input.menuItemById.get(line.menuItemId);
      const hasOptions = Boolean(item?.priceOptions?.length);
      const option = findMenuPriceOption(item?.priceOptions, line.priceOptionId);
      if (
        !item ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity <= 0 ||
        line.quantity > MAX_POSTGRES_INTEGER ||
        !Number.isFinite(item.price) ||
        item.price < 0 ||
        item.price > MAX_DATABASE_MONEY ||
        hasOptions !== Boolean(line.priceOptionId) ||
        (hasOptions && !option)
      ) return null;
      const unitPrice = option?.price ?? item.price;
      return {
        menuItemId: item.id,
        itemName: option ? `${item.name} · ${option.label}` : item.name,
        unitPrice: roundToCents(unitPrice),
        quantity: line.quantity,
        priceOptionId: option?.id ?? null,
      };
    })
    .filter((l): l is OrderPricingLineItem => l !== null);

  if (lineItems.length === 0 || lineItems.length !== input.cart.length) return null;

  const subtotal = roundToCents(lineItems.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const taxAmount = roundToCents(subtotal * input.taxRate);
  const tipAmount =
    input.acceptsTips && Number.isFinite(input.requestedTipAmount) ? roundToCents(Math.max(0, input.requestedTipAmount)) : 0;
  const total = roundToCents(subtotal + taxAmount + tipAmount);

  // orders and order_items use numeric(10,2)/integer columns. Reject invalid
  // server data or unrepresentable totals before creating a partial order or
  // asking Stripe to authorize an impossible amount.
  if (
    !Number.isFinite(subtotal) || subtotal > MAX_DATABASE_MONEY ||
    !Number.isFinite(taxAmount) || taxAmount > MAX_DATABASE_MONEY ||
    !Number.isFinite(tipAmount) || tipAmount > MAX_DATABASE_MONEY ||
    !Number.isFinite(total) || total > MAX_DATABASE_MONEY
  ) return null;

  return { lineItems, subtotal, taxAmount, tipAmount, total };
}
