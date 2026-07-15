import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { getSuppliers } from "@/lib/data/suppliers";
import { getPurchaseOrders } from "@/lib/data/purchase-orders";
import { FournisseursView } from "./FournisseursView";

export default async function FournisseursPage() {
  const restaurantId = await getCurrentRestaurantId();

  const [suppliers, orders] = restaurantId
    ? await Promise.all([getSuppliers(restaurantId), getPurchaseOrders(restaurantId)])
    : [[], []];

  return <FournisseursView restaurantId={restaurantId} initialSuppliers={suppliers} initialOrders={orders} />;
}
