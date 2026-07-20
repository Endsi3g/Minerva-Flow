"use server";

import { revalidatePath } from "next/cache";
import { getCurrentRestaurantId, getCurrentMembership } from "@/lib/data/current-restaurant";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getCampaigns } from "@/lib/data/campaigns";
import { getFinancialTransactions } from "@/lib/data/finance";
import { getRestaurant } from "@/lib/data/restaurants";
import { buildReports, type ReportData } from "@/lib/reports";
import { generateAiReview } from "@/lib/ai/review";
import { getMenuItems } from "@/lib/data/menu";
import { getWasteSummary } from "@/lib/data/inventory";
import { buildMenuWasteContext } from "@/lib/menu-engineering";
import { saveAiReview, getAiReviews, getAiReview, type AiReview } from "@/lib/data/ai-reviews";
import { notifyRestaurant } from "@/lib/data/notifications";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";
import { getTranslations } from "next-intl/server";

export async function getAiReviewsAction(): Promise<AiReview[]> {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return [];
  return getAiReviews(restaurantId);
}

export async function getAiReviewAction(id: string): Promise<AiReview | null> {
  if (!id) return null;
  return getAiReview(id);
}

/**
 * On-demand AI review over an arbitrary date range — reuses the exact same
 * buildReports pipeline as the weekly cron, just fed range-scoped data
 * instead of a fixed Monday-Sunday window.
 */
export async function generateAiReviewAction(range: {
  from: string;
  to: string;
}): Promise<{ ok: boolean; reviewId?: string; error?: string }> {
  const t = await getTranslations("aiReview");
  const tCommon = await getTranslations("common");
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) return { ok: false, error: tCommon("noRestaurantSelected") };

  const membership = await getCurrentMembership();
  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return { ok: false, error: t("errorOwnerManagerOnly") };
  }

  const [restaurant, serviceDays, programs, campaigns, financialTransactions, menuItems, wasteSummary] = await Promise.all([
    getRestaurant(restaurantId),
    getServiceDays(restaurantId, range),
    getPrograms(restaurantId),
    getCampaigns(restaurantId),
    getFinancialTransactions(restaurantId, range),
    getMenuItems(restaurantId),
    getWasteSummary(restaurantId, range),
  ]);

  const data: ReportData = { serviceDays, programs, campaigns, financialTransactions };
  const reports = buildReports(data);
  const menuWasteContext = buildMenuWasteContext(menuItems, wasteSummary);

  const periodLabel = `${formatDate(range.from)} — ${formatDate(range.to)}`;
  const review = await generateAiReview(restaurant?.name ?? "ce restaurant", periodLabel, reports, menuWasteContext);
  if (!review) {
    return { ok: false, error: t("errorGenerationFailed") };
  }

  const saved = await saveAiReview({
    restaurantId,
    periodStart: range.from,
    periodEnd: range.to,
    source: "manuelle",
    metrics: reports,
    review,
  });
  if (!saved) return { ok: false, error: t("errorSaveFailed") };

  await notifyRestaurant({
    restaurantId,
    type: "ai_review.generated",
    title: t("notificationTitle"),
    body: t("notificationBody", { period: periodLabel }),
    link: `/reports/ai-review/${saved.id}`,
  });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: user.id,
      event: "ai_review_generated",
      properties: { period_from: range.from, period_to: range.to, source: "manuelle" },
    });
    await posthog.flush();
  }

  revalidatePath("/reports/ai-review");
  return { ok: true, reviewId: saved.id };
}
