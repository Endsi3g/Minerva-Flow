import { NextResponse } from "next/server";
import { runCloverOrderExport } from "@/lib/pos/clover-order-worker";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  // A saved OAuth connection alone is not a verified Orders/Register integration.
  if (process.env.CLOVER_ORDER_EXPORT_VALIDATED !== "1") {
    return NextResponse.json({ enabled: false, reason: "merchant_validation_required" });
  }
  try { return NextResponse.json(await runCloverOrderExport()); }
  catch { return NextResponse.json({ error: "clover_export_worker_failed" }, { status: 503 }); }
}
