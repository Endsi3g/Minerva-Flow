import { NextResponse } from "next/server";
import { getCurrentRestaurantId } from "@/lib/data/current-restaurant";
import { extractMenuFromPdf } from "@/lib/ai/menu-extraction";

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
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Le fichier doit être un PDF." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Le PDF dépasse la taille maximale (8 Mo)." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await extractMenuFromPdf(bytes);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ items: result.items });
}
