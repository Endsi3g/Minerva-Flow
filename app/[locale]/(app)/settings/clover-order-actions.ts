"use server";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { createClient } from "@/lib/supabase/server";
import { getValidCloverAccessToken } from "@/lib/pos/clover";
import { cloverEnvironment } from "@/lib/pos/config";
import { CloverOrderApi } from "@/lib/pos/clover-order-api";
import { cents } from "@/lib/pos/clover-order-contract";
import type { MenuPriceOption } from "@/lib/types";

export type CloverOrderSetup = {
  orderTypeId: string;
  enabled: boolean;
  employeeAttribution: boolean;
  automaticCancellation: boolean;
  exportValidated: boolean;
  cancellationValidated: boolean;
  menu: { id: string; name: string; price: number; price_options: MenuPriceOption[] }[];
  mappings: { menu_item_id: string; price_option_id: string; clover_item_id: string; modifier_ids: string[] }[];
};
async function authorized(restaurantId: string) {
  const membership = await getCurrentMembership();
  return membership?.restaurantId === restaurantId && ["owner","manager"].includes(membership.role);
}
export async function getCloverOrderSetupAction(restaurantId: string): Promise<{ ok: true; setup: CloverOrderSetup } | { ok: false; reason: string }> {
  if (!await authorized(restaurantId)) return { ok: false, reason: "unauthorized" };
  const client = await createClient();
  const connection = await client.from("pos_connections").select("external_account_id,status").eq("restaurant_id",restaurantId).eq("provider","clover").maybeSingle();
  if (connection.error || connection.data?.status !== "connecte" || !connection.data.external_account_id) return { ok: false, reason: "merchant_connection_required" };
  const merchantId = connection.data.external_account_id;
  const [settings, menu, mappings] = await Promise.all([
    client.from("clover_order_settings").select("*").eq("restaurant_id",restaurantId).eq("merchant_id",merchantId).eq("environment",cloverEnvironment()).maybeSingle(),
    client.from("menu_items").select("id,name,price,price_options").eq("restaurant_id",restaurantId).eq("is_draft",false).order("name"),
    client.from("clover_order_item_mappings").select("menu_item_id,price_option_id,clover_item_id,modifier_ids").eq("restaurant_id",restaurantId).eq("merchant_id",merchantId).eq("environment",cloverEnvironment()),
  ]);
  if (settings.error || menu.error || mappings.error) return { ok: false, reason: "schema_or_connection_unavailable" };
  return { ok: true, setup: { orderTypeId: settings.data?.order_type_id ?? "", enabled: settings.data?.enabled === true,
    employeeAttribution: settings.data?.employee_attribution === true, automaticCancellation: settings.data?.automatic_cancellation === true,
    exportValidated: process.env.CLOVER_ORDER_EXPORT_VALIDATED === "1", cancellationValidated: process.env.CLOVER_AUTOMATIC_CANCELLATION_VALIDATED === "1",
    menu: menu.data as CloverOrderSetup["menu"], mappings: mappings.data as CloverOrderSetup["mappings"] } };
}
export async function saveCloverOrderSetupAction(restaurantId: string, input: { orderTypeId: string; enabled: boolean; employeeAttribution: boolean; automaticCancellation: boolean }): Promise<{ ok: boolean; reason?: string }> {
  if (!await authorized(restaurantId)) return { ok: false, reason: "unauthorized" };
  if (typeof input?.orderTypeId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(input.orderTypeId) || [input.enabled,input.employeeAttribution,input.automaticCancellation].some(v => typeof v !== "boolean")) return { ok: false, reason: "invalid_configuration" };
  if (input.enabled && process.env.CLOVER_ORDER_EXPORT_VALIDATED !== "1" || input.automaticCancellation && process.env.CLOVER_AUTOMATIC_CANCELLATION_VALIDATED !== "1") return { ok: false, reason: "merchant_validation_required" };
  const token = await getValidCloverAccessToken(restaurantId);
  if (!token?.merchantId) return { ok: false, reason: "merchant_connection_required" };
  try {
    const type = await new CloverOrderApi(token.accessToken,token.merchantId).orderType(input.orderTypeId);
    if (type.id !== input.orderTypeId || type.isHidden || type.isDeleted) return { ok: false, reason: "invalid_order_type" };
    const result = await (await createClient()).from("clover_order_settings").upsert({ restaurant_id: restaurantId, merchant_id: token.merchantId,
      environment: cloverEnvironment(), order_type_id: input.orderTypeId, enabled: input.enabled,
      employee_attribution: input.employeeAttribution, automatic_cancellation: input.automaticCancellation });
    return result.error ? { ok: false, reason: "configuration_save_failed" } : { ok: true };
  } catch { return { ok: false, reason: "clover_verification_failed" }; }
}
export async function saveCloverOrderMappingAction(restaurantId: string, input: { menuItemId: string; priceOptionId: string; cloverItemId: string; modifierIds: string[] }): Promise<{ ok: boolean; reason?: string }> {
  if (!await authorized(restaurantId)) return { ok: false, reason: "unauthorized" };
  if (!input || typeof input.menuItemId !== "string" || typeof input.priceOptionId !== "string" || typeof input.cloverItemId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(input.cloverItemId)
    || !Array.isArray(input.modifierIds) || input.modifierIds.length > 20 || input.modifierIds.some(id => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) || new Set(input.modifierIds).size !== input.modifierIds.length) return { ok: false, reason: "invalid_mapping" };
  const client = await createClient();
  const item = await client.from("menu_items").select("price,price_options,is_draft").eq("restaurant_id",restaurantId).eq("id",input.menuItemId).maybeSingle();
  if (item.error || !item.data || item.data.is_draft !== false) return { ok: false, reason: "reviewed_product_required" };
  const options = (item.data.price_options ?? []) as MenuPriceOption[];
  const option = options.find(o => o.id === input.priceOptionId);
  if (options.length ? !option : input.priceOptionId !== "") return { ok: false, reason: "invalid_format" };
  const token = await getValidCloverAccessToken(restaurantId);
  if (!token?.merchantId) return { ok: false, reason: "merchant_connection_required" };
  try {
    const product = await new CloverOrderApi(token.accessToken,token.merchantId).product(input.cloverItemId);
    if (product.id !== input.cloverItemId || product.hidden || product.deleted || product.priceType !== "FIXED") return { ok: false, reason: "clover_product_unavailable" };
    let price = product.price;
    for (const id of input.modifierIds) {
      const modifier = product.modifiers.find(m => m.id === id);
      if (!modifier || !Number.isSafeInteger(modifier.amount)) return { ok: false, reason: "modifier_mapping_required" };
      price += modifier.amount;
    }
    if (price !== cents(Number(option?.price ?? item.data.price))) return { ok: false, reason: "catalog_price_mismatch" };
    const saved = await client.from("clover_order_item_mappings").upsert({ restaurant_id:restaurantId, merchant_id:token.merchantId,environment:cloverEnvironment(),
      menu_item_id:input.menuItemId,price_option_id:input.priceOptionId,clover_item_id:input.cloverItemId,modifier_ids:input.modifierIds,verified_at:new Date().toISOString() });
    return saved.error ? { ok: false, reason: "mapping_save_failed" } : { ok: true };
  } catch { return { ok: false, reason: "clover_verification_failed" }; }
}
