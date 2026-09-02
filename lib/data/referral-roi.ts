import { createClient } from "@/lib/supabase/server";

export type ReferralRoiMetrics = {
  totalClicks: number;
  totalConversions: number;
  conversionRatePct: number;
  totalRevenueGenerated: number;
  estimatedRewardsCost: number;
  netProfitGenerated: number;
  roiMultiplier: number;
  activeProgramsCount: number;
  activeAmbassadorsCount: number;
};

export type TopAmbassador = {
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  totalSpent: number;
  referralClicks: number;
  referralConversions: number;
  revenueGenerated: number;
  rewardsClaimedCount: number;
};

/**
 * Computes aggregate ROI and financial performance for all referral programs of a restaurant.
 */
export async function computeReferralRoiMetrics(restaurantId: string): Promise<ReferralRoiMetrics> {
  const supabase = await createClient();

  const [
    { data: programsData },
    { data: ordersData },
    { data: restaurantData },
  ] = await Promise.all([
    supabase.from("referral_programs").select("*").eq("restaurant_id", restaurantId),
    supabase.from("orders").select("id, total, referral_link_id, status").eq("restaurant_id", restaurantId).neq("status", "annulee"),
    supabase.from("restaurants").select("loyalty_points_per_dollar").eq("id", restaurantId).maybeSingle(),
  ]);

  // Points are worth what the restaurant itself says they're worth — its
  // own earn rate — rather than a flat guess, so two restaurants with very
  // different reward generosity get honestly different cost estimates.
  const pointsPerDollar = (restaurantData as { loyalty_points_per_dollar: number } | null)?.loyalty_points_per_dollar || 1;

  const programs =
    (programsData as {
      id: string;
      active: boolean;
      referrer_bonus_points: number;
      new_customer_bonus_points: number;
      reward_id: string | null;
    }[]) ?? [];
  if (programs.length === 0) {
    return {
      totalClicks: 0,
      totalConversions: 0,
      conversionRatePct: 0,
      totalRevenueGenerated: 0,
      estimatedRewardsCost: 0,
      netProfitGenerated: 0,
      roiMultiplier: 0,
      activeProgramsCount: 0,
      activeAmbassadorsCount: 0,
    };
  }

  const programIds = programs.map((p) => p.id);
  const rewardIds = Array.from(new Set(programs.map((p) => p.reward_id).filter((id): id is string => Boolean(id))));

  const [{ data: linkRows }, { data: rewardRows }] = await Promise.all([
    supabase
      .from("customer_referral_links")
      .select("id, referral_program_id, customer_id, clicks, converted_count, reward_claimed_at")
      .in("referral_program_id", programIds),
    rewardIds.length > 0
      ? supabase.from("loyalty_rewards").select("id, points_cost, menu_item_id").in("id", rewardIds)
      : Promise.resolve({ data: [] as { id: string; points_cost: number; menu_item_id: string | null }[] }),
  ]);

  const links = (linkRows as { id: string; referral_program_id: string; customer_id: string; clicks: number; converted_count: number; reward_claimed_at: string | null }[]) ?? [];
  const rewardRowsTyped = (rewardRows as { id: string; points_cost: number; menu_item_id: string | null }[]) ?? [];
  const rewardById = new Map(rewardRowsTyped.map((r) => [r.id, r]));
  const programById = new Map(programs.map((p) => [p.id, p]));

  // A milestone reward that gives away a real menu item carries its actual
  // food cost — pulled straight from the menu, not guessed via the
  // points-per-dollar rate, so its ROI impact is exact rather than estimated.
  const linkedMenuItemIds = Array.from(
    new Set(rewardRowsTyped.map((r) => r.menu_item_id).filter((id): id is string => Boolean(id)))
  );
  const { data: linkedMenuItemRows } =
    linkedMenuItemIds.length > 0
      ? await supabase.from("menu_items").select("id, food_cost").in("id", linkedMenuItemIds)
      : { data: [] as { id: string; food_cost: number }[] };
  const foodCostByMenuItemId = new Map(
    ((linkedMenuItemRows as { id: string; food_cost: number }[]) ?? []).map((m) => [m.id, m.food_cost])
  );

  const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
  const totalConversions = links.reduce((sum, l) => sum + (l.converted_count || 0), 0);
  const conversionRatePct = totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 1000) / 10 : 0;

  // Map orders attributed to referral links
  const referralLinkIds = new Set(links.map((l) => l.id));
  const attributedOrders = ((ordersData as { id: string; total: number; referral_link_id: string | null }[]) ?? []).filter(
    (o) => o.referral_link_id && referralLinkIds.has(o.referral_link_id)
  );

  // Revenue generated: total of direct referral orders + estimated base from reservations/conversions
  const orderRevenue = attributedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  // For conversions with no directly-linked order, fall back to this restaurant's own real
  // average order value (computed from its actual order history) rather than a flat guess —
  // only use the $45 generic estimate when the restaurant has no order history at all yet.
  const allOrders = (ordersData as { id: string; total: number; referral_link_id: string | null }[]) ?? [];
  const realAverageOrderValue = allOrders.length > 0 ? allOrders.reduce((sum, o) => sum + (o.total || 0), 0) / allOrders.length : 45;
  const unlinkedConversions = Math.max(0, totalConversions - attributedOrders.length);
  const totalRevenueGenerated = Math.round((orderRevenue + unlinkedConversions * realAverageOrderValue) * 100) / 100;

  // Real reward cost: what each program actually pays out — the referrer +
  // new-customer bonus points per conversion, plus the milestone reward on
  // each claim. A milestone reward linked to a real menu item contributes
  // its actual food cost in dollars; everything else (bonus points, an
  // unlinked reward's points_cost) is converted at this restaurant's own
  // points-per-dollar rate, not a flat guess shared by every restaurant.
  let rawRewardsPoints = 0;
  let realRewardDollarCost = 0;
  for (const link of links) {
    const program = programById.get(link.referral_program_id);
    if (!program) continue;
    const perConversionPoints = (program.referrer_bonus_points || 0) + (program.new_customer_bonus_points || 0);
    rawRewardsPoints += (link.converted_count || 0) * perConversionPoints;
    if (link.reward_claimed_at && program.reward_id) {
      const reward = rewardById.get(program.reward_id);
      const linkedFoodCost = reward?.menu_item_id ? foodCostByMenuItemId.get(reward.menu_item_id) : undefined;
      if (linkedFoodCost !== undefined) {
        realRewardDollarCost += linkedFoodCost;
      } else {
        rawRewardsPoints += reward?.points_cost || 0;
      }
    }
  }
  const estimatedRewardsCost = Math.round((rawRewardsPoints / pointsPerDollar + realRewardDollarCost) * 100) / 100;

  const netProfitGenerated = Math.round((totalRevenueGenerated - estimatedRewardsCost) * 100) / 100;
  // No cost basis to divide by means no multiplier to report — not a fabricated placeholder.
  const roiMultiplier = estimatedRewardsCost > 0 ? Math.round((totalRevenueGenerated / estimatedRewardsCost) * 10) / 10 : 0;

  const uniqueAmbassadors = new Set(links.filter((l) => (l.clicks || 0) > 0 || (l.converted_count || 0) > 0).map((l) => l.customer_id));

  return {
    totalClicks,
    totalConversions,
    conversionRatePct,
    totalRevenueGenerated,
    estimatedRewardsCost,
    netProfitGenerated,
    roiMultiplier,
    activeProgramsCount: programs.filter((p) => p.active).length,
    activeAmbassadorsCount: uniqueAmbassadors.size,
  };
}

/**
 * Gets the top performing customers bringing new business via referral links.
 */
export async function getTopAmbassadors(restaurantId: string, limit: number = 8): Promise<TopAmbassador[]> {
  const supabase = await createClient();

  const { data: programRows } = await supabase.from("referral_programs").select("id").eq("restaurant_id", restaurantId);
  const programIds = ((programRows as { id: string }[]) ?? []).map((p) => p.id);
  if (programIds.length === 0) return [];

  const { data: linkRows } = await supabase
    .from("customer_referral_links")
    .select("id, customer_id, clicks, converted_count, reward_claimed_at")
    .in("referral_program_id", programIds);

  const links = (linkRows as { id: string; customer_id: string; clicks: number; converted_count: number; reward_claimed_at: string | null }[]) ?? [];
  if (links.length === 0) return [];

  // Group by customer
  const customerLinkMap = new Map<
    string,
    { clicks: number; converted: number; claimed: number; linkIds: string[] }
  >();

  for (const l of links) {
    const curr = customerLinkMap.get(l.customer_id) ?? { clicks: 0, converted: 0, claimed: 0, linkIds: [] };
    curr.clicks += l.clicks || 0;
    curr.converted += l.converted_count || 0;
    if (l.reward_claimed_at) curr.claimed += 1;
    curr.linkIds.push(l.id);
    customerLinkMap.set(l.customer_id, curr);
  }

  const customerIds = Array.from(customerLinkMap.keys());
  if (customerIds.length === 0) return [];

  const [{ data: customerRows }, { data: ordersData }] = await Promise.all([
    supabase.from("customers").select("id, name, email, total_spent").in("id", customerIds),
    supabase.from("orders").select("total, referral_link_id").eq("restaurant_id", restaurantId).neq("status", "annulee"),
  ]);

  const customerMap = new Map(((customerRows as { id: string; name: string; email: string | null; total_spent: number }[]) ?? []).map((c) => [c.id, c]));

  const allOrders = (ordersData as { total: number; referral_link_id: string | null }[]) ?? [];
  const realAverageOrderValue = allOrders.length > 0 ? allOrders.reduce((sum, o) => sum + (o.total || 0), 0) / allOrders.length : 45;

  const ordersByLinkId = new Map<string, number>();
  for (const o of allOrders) {
    if (o.referral_link_id) {
      ordersByLinkId.set(o.referral_link_id, (ordersByLinkId.get(o.referral_link_id) || 0) + (o.total || 0));
    }
  }

  const ambassadors: TopAmbassador[] = [];

  for (const [customerId, stats] of customerLinkMap.entries()) {
    const customer = customerMap.get(customerId);
    if (!customer) continue;

    let directOrderRevenue = 0;
    for (const linkId of stats.linkIds) {
      directOrderRevenue += ordersByLinkId.get(linkId) || 0;
    }

    const estimatedBaseRevenue = stats.converted * realAverageOrderValue;
    const revenueGenerated = Math.max(directOrderRevenue, estimatedBaseRevenue);

    ambassadors.push({
      customerId,
      customerName: customer.name,
      customerEmail: customer.email,
      totalSpent: customer.total_spent || 0,
      referralClicks: stats.clicks,
      referralConversions: stats.converted,
      revenueGenerated: Math.round(revenueGenerated * 100) / 100,
      rewardsClaimedCount: stats.claimed,
    });
  }

  return ambassadors.sort((a, b) => b.referralConversions - a.referralConversions || b.revenueGenerated - a.revenueGenerated).slice(0, limit);
}
