"use server";

import { isSquareConfigured } from "@/lib/pos/config";
import { getPosConnections, type PosConnection } from "@/lib/data/pos-connections";

export async function getPosStatusAction(
  restaurantId: string
): Promise<{ squareConfigured: boolean; connections: PosConnection[] }> {
  if (!restaurantId) return { squareConfigured: false, connections: [] };
  const connections = await getPosConnections(restaurantId);
  return { squareConfigured: isSquareConfigured(), connections };
}
