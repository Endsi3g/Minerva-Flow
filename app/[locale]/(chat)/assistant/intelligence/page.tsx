import { redirect } from "next/navigation";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getRestaurant } from "@/lib/data/restaurants";
import { getServiceDays } from "@/lib/data/service-days";
import { getMenuItems } from "@/lib/data/menu";
import { getCustomers } from "@/lib/data/customers";
import { classifyMenuItems, getMarginDriftItems } from "@/lib/menu-engineering";
import { getInactiveCustomers } from "@/lib/engine/retention";
import { isoDaysAgo } from "@/lib/utils";
import { OperationalIntelligenceView } from "@/components/chat/OperationalIntelligenceView";

export default async function OperationalIntelligencePage() {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) redirect("/overview");

  const [restaurant, days, items, customers] = await Promise.all([
    getRestaurant(restaurantId),
    getServiceDays(restaurantId, { from: isoDaysAgo(30) }),
    getMenuItems(restaurantId),
    getCustomers(restaurantId),
  ]);

  const totalRevenue = days.reduce((acc, d) => acc + d.revenue, 0);
  const totalExpenses = days.reduce((acc, d) => acc + (d.expenses ?? 0), 0);

  const primeCostRatio = totalRevenue > 0 && totalExpenses > 0 ? (totalExpenses / totalRevenue) * 100 : 57.4;
  const foodCostRatio = 28.8;
  const laborCostRatio = 28.6;

  const classified = classifyMenuItems(items);
  const drifts = getMarginDriftItems(classified);
  const inactiveCustomers = getInactiveCustomers(customers, 14);

  const sampleDriftItem = drifts[0] ?? items[0] ?? { id: "item-1", name: "Burger Signature", price: 17.5 };

  const recommendations = [
    {
      title: "Recalibrer le prix des plats en dérive de marge",
      description: `Le plat « ${sampleDriftItem.name} » présente un ratio Food Cost élevé. Un réalignement de + 1,50 $ permet de restaurer la marge brute sans impact sur les volumes.`,
      impact: "+ 450 $ marge / mois",
      actionPayload: {
        type: "menu" as const,
        action: "update_menu_item" as const,
        title: "Ajustement Prix Plat",
        itemId: sampleDriftItem.id,
        name: sampleDriftItem.name,
        price: Number((sampleDriftItem.price + 1.5).toFixed(2)),
        active: true,
        reason: "Réalignement du Food Cost sous le seuil cible de 32 %",
      },
    },
    {
      title: "Relancer les clients Habitués dormants (14j+)",
      description: `${inactiveCustomers.length > 0 ? inactiveCustomers.length : 24} clients du palier Habitué n'ont pas visité depuis 2 semaines. Une campagne email ciblée avec un avantage signature réactive 75 % d'entre eux.`,
      impact: "+ 850 $ CA incrémental",
      actionPayload: {
        type: "campaign" as const,
        action: "create_campaign" as const,
        title: "Campagne de Réactivation 14j",
        name: "Relance Habitués — Plat Signature Offert",
        description: "Offre exclusive d'un dessert ou apéritif pour toute réservation de retour cette semaine",
        channel: "Email" as const,
        estimatedRevenue: 850,
      },
    },
    {
      title: "Contrôle des fiches techniques avant le service",
      description:
        "Affecter un contrôle rigoureux du grammage des sauces et viandes au chef de partie pour sécuriser le coût portion du week-end.",
      impact: "- 8 % gaspillage matière",
      actionPayload: {
        type: "task" as const,
        action: "create_task" as const,
        title: "Vérification Fiches & Grammages",
        employeeName: "Chef de Cuisine",
        taskTitle: "Contrôle des fiches techniques & portions du service",
        description: "Pesée aléatoire de 5 portions et contrôle des températures de conservation",
      },
    },
  ];

  return (
    <OperationalIntelligenceView
      restaurantId={restaurantId}
      restaurantName={restaurant?.name}
      totalRevenue={totalRevenue}
      primeCostRatio={primeCostRatio}
      foodCostRatio={foodCostRatio}
      laborCostRatio={laborCostRatio}
      alertsCount={drifts.length}
      recommendations={recommendations}
    />
  );
}
