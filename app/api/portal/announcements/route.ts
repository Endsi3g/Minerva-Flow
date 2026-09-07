import { NextResponse } from "next/server";
import { getActiveAnnouncements } from "@/lib/data/announcements";

export async function GET() {
  try {
    const announcements = await getActiveAnnouncements();
    return NextResponse.json({ ok: true, announcements });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "Erreur lors du chargement des annonces" },
      { status: 500 }
    );
  }
}
