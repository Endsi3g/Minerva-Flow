/** Pure validation for the Clover REST atomic-order contract. Money is cents. */
export type CloverOrderSnapshot = {
  id: string;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  total: number;
  delivery_fee: number;
  payment_status: string;
  notes: string | null;
  created_at: string;
  items: {
    id: string;
    menu_item_id: string | null;
    item_name: string;
    unit_price: number;
    quantity: number;
    notes: string | null;
    price_option_id: string | null;
    price_option_label: string | null;
  }[];
};
export type CloverOrderMapping = {
  menu_item_id: string;
  price_option_id: string;
  clover_item_id: string;
  modifier_ids: string[];
};
export type CloverCatalogProduct = {
  id: string;
  price: number;
  priceType: string;
  hidden?: boolean;
  deleted?: boolean;
  modifiers: { id: string; amount: number }[];
};
export type CloverAtomicPayload = {
  orderCart: {
    currency: "CAD";
    title: string;
    note: string;
    orderType: { id: string };
    lineItems: {
      item: { id: string };
      name: string;
      price: number;
      note: string;
      modifications: { modifier: { id: string }; amount: number }[];
    }[];
  };
};
export class CloverOrderValidationError extends Error {
  constructor(public readonly code: string) { super(code); }
}
export function cents(value: number): number {
  const result = Math.round(value * 100);
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(result) || Math.abs(result - value * 100) > 0.00001) {
    throw new CloverOrderValidationError("invalid_money");
  }
  return result;
}
export function cloverOrderReference(orderId: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new CloverOrderValidationError("invalid_order_id");
  }
  return `Minerva Flow:${orderId}`;
}
export function parseCloverOrderReference(title?: string, note?: string): string | null {
  const firstLine = (note ?? "").split("\n")[0];
  for (const value of [title, firstLine]) {
    const match = value?.match(/^Minerva Flow:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (match) return match[1].toLowerCase();
  }
  return null;
}
export function buildCloverAtomicPayload(
  order: CloverOrderSnapshot,
  orderTypeId: string,
  mappings: CloverOrderMapping[],
  products: CloverCatalogProduct[],
): CloverAtomicPayload {
  // Do not silently drop fees, tips or online payment semantics. Their Clover
  // representation requires a separately verified integration.
  if (order.payment_status !== "non_requis") throw new CloverOrderValidationError("unsupported_payment_mode");
  if (cents(order.delivery_fee ?? 0) || cents(order.tip_amount ?? 0)) throw new CloverOrderValidationError("unsupported_fee_or_tip");
  if (!orderTypeId || !order.items.length || order.items.length > 100) throw new CloverOrderValidationError("invalid_order_items");
  const reference = cloverOrderReference(order.id);
  const lineItems: CloverAtomicPayload["orderCart"]["lineItems"] = [];
  let subtotal = 0;
  for (const line of order.items) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) throw new CloverOrderValidationError("invalid_quantity");
    const matching = mappings.filter(m => m.menu_item_id === line.menu_item_id && m.price_option_id === (line.price_option_id ?? ""));
    if (matching.length !== 1) throw new CloverOrderValidationError("product_mapping_required");
    const mapping = matching[0];
    const product = products.find(p => p.id === mapping.clover_item_id);
    if (!product || product.priceType !== "FIXED" || product.hidden || product.deleted || !Number.isSafeInteger(product.price) || product.price < 0) {
      throw new CloverOrderValidationError("clover_product_unavailable");
    }
    if (new Set(mapping.modifier_ids).size !== mapping.modifier_ids.length) throw new CloverOrderValidationError("duplicate_modifier");
    const modifications = mapping.modifier_ids.map(id => {
      const modifier = product.modifiers.find(m => m.id === id);
      if (!modifier || !Number.isSafeInteger(modifier.amount) || modifier.amount < 0) throw new CloverOrderValidationError("modifier_mapping_required");
      return { modifier: { id }, amount: modifier.amount };
    });
    const price = product.price + modifications.reduce((sum, m) => sum + m.amount, 0);
    if (price !== cents(line.unit_price)) throw new CloverOrderValidationError("catalog_price_mismatch");
    subtotal += price * line.quantity;
    // Clover unitQty applies to PER_UNIT pricing, not fixed-price quantities.
    // Fixed-price quantities are represented by one line per purchased unit.
    for (let unit = 0; unit < line.quantity; unit++) {
      lineItems.push({ item: { id: product.id }, name: line.item_name, price: product.price,
        note: [line.price_option_label, line.notes].filter(Boolean).join("\n"), modifications });
    }
  }
  if (lineItems.length > 3000) throw new CloverOrderValidationError("too_many_clover_lines");
  if (subtotal !== cents(order.subtotal) || cents(order.total) !== subtotal + cents(order.tax_amount)) {
    throw new CloverOrderValidationError("order_amount_mismatch");
  }
  return { orderCart: { currency: "CAD", title: reference,
    note: [reference, order.notes].filter(Boolean).join("\n"), orderType: { id: orderTypeId }, lineItems } };
}
export function assertCloverCheckoutAmounts(order: CloverOrderSnapshot, checkout: { subtotal?: number; totalTaxAmount?: number; total?: number; isVat?: boolean }): void {
  if (checkout.isVat || checkout.subtotal !== cents(order.subtotal) || checkout.totalTaxAmount !== cents(order.tax_amount) || checkout.total !== cents(order.total)) {
    throw new CloverOrderValidationError("clover_checkout_amount_mismatch");
  }
}
