import { redirect } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getConversations, getConversation, getMessages, getLatestArtifact } from "@/lib/data/chat";
import { getServiceDays } from "@/lib/data/service-days";
import { getPrograms } from "@/lib/data/programs";
import { getFinancialTransactions, getConnections } from "@/lib/data/finance";
import { getAlertRules } from "@/lib/data/alerts";
import { buildReports, type ReportData } from "@/lib/reports";
import { computeAlerts } from "@/lib/engine/alerts";
import { AssistantChatView } from "@/components/chat/AssistantChatView";
import type { CanvasContextData } from "@/components/chat/CanvasDefaultContext";

export default async function AssistantConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) redirect("/overview");

  const conversation = await getConversation(conversationId);
  if (!conversation || conversation.restaurantId !== restaurantId) {
    redirect("/assistant");
  }

  const [conversations, messages, artifact, serviceDays, programs, financialTransactions, connections, alertRules] =
    await Promise.all([
      getConversations(restaurantId),
      getMessages(conversationId),
      getLatestArtifact(conversationId),
      getServiceDays(restaurantId),
      getPrograms(restaurantId),
      getFinancialTransactions(restaurantId),
      getConnections(restaurantId),
      getAlertRules(restaurantId),
    ]);

  const reportData: ReportData = { serviceDays, programs, campaigns: [], financialTransactions };
  const reports = buildReports(reportData);
  const totalRevenue = reports.find((r) => r.slug === "revenu")?.value ?? 0;
  const estimatedMargin = reports.find((r) => r.slug === "marge")?.value ?? 0;

  const alerts = computeAlerts({ serviceDays, connections, alertRules, financialTransactions }).slice(0, 4);
  const activePrograms = programs.filter((p) => p.status === "actif").slice(0, 3);

  const defaultContext: CanvasContextData = { totalRevenue, estimatedMargin, alerts, activePrograms };

  return (
    <AssistantChatView
      restaurantId={restaurantId}
      conversationId={conversationId}
      conversations={conversations}
      initialMessages={messages}
      initialArtifact={artifact}
      defaultContext={defaultContext}
    />
  );
}
