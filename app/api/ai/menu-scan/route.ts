import { NextResponse } from "next/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { extractMenuFromFile } from "@/lib/ai/menu-extraction";

const MAX_FILE_BYTES = 8 * 1000 * 1000;

export async function POST(request: Request) {
  const restaurantId = await getCurrentRestaurantId();
  if (!restaurantId) {
    return NextResponse.json({ error: "Aucun restaurant associé à ce compte." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  const supportedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
  if (!supportedTypes.includes(file.type as (typeof supportedTypes)[number])) {
    return NextResponse.json({ error: "Choisissez un PDF ou une image JPG, PNG ou WebP." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Le fichier dépasse la taille maximale (8 Mo)." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await extractMenuFromFile(bytes, file.type as (typeof supportedTypes)[number]);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ items: result.items });
}
