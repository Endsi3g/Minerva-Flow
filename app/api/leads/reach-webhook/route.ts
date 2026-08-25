import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createProspect, saveProspectAudit, updateProspectMeta } from "@/lib/data/prospects";
import { runWebsiteAudit } from "@/lib/prospects/audit/run-audit";
import { emptyMenu } from "@/lib/prospects/parse-menu";
import type { ProspectSourcePlatform } from "@/lib/prospects/types";
import { getDemoUrl } from "@/lib/prospects/demo-url";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function verifyAuth(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-reach-secret");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : secretHeader;

  if (!token) return false;

  const expectedSecret = process.env.REACH_WEBHOOK_SECRET || process.env.MCP_SERVER_TOKEN;
  if (!expectedSecret) return false;

  return safeEqual(token, expectedSecret);
}

export async function POST(req: Request) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: "Non autorisé : secret Reach invalide" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const restaurantName = body.restaurantName || body.company_name || body.name;
    const sourceUrl = body.sourceUrl || body.website || body.url || "https://example.com";
    const sourcePlatform: ProspectSourcePlatform = body.sourcePlatform || body.platform || "other";
    const currency = body.currency || "CAD";
    const detectedAddress = body.detectedAddress || body.address || null;
    const commissionRatePct = Number(body.commissionRatePct || body.commission_rate || 30);
    const assumedMonthlyOrders = Number(body.assumedMonthlyOrders || body.monthly_orders || 400);
    const contactEmail = body.contactEmail || body.email || null;
    const contactPhone = body.contactPhone || body.phone || null;
    const contactName = body.contactName || body.contact || null;
    const notes = [
      body.notes,
      contactName ? `Contact: ${contactName}` : null,
      contactEmail ? `Email: ${contactEmail}` : null,
      contactPhone ? `Tél: ${contactPhone}` : null,
      body.reachLeadId ? `Lead Reach ID: ${body.reachLeadId}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    if (!restaurantName || !restaurantName.trim()) {
      return NextResponse.json({ error: "restaurantName est requis" }, { status: 400 });
    }

    const prospect = await createProspect({
      restaurantName: restaurantName.trim(),
      sourceUrl: sourceUrl.trim(),
      sourcePlatform,
      currency,
      detectedAddress,
      commissionRatePct,
      assumedMonthlyOrders,
      menu: body.menu || emptyMenu(),
    });

    if (!prospect) {
      return NextResponse.json({ error: "Impossible de créer le prospect" }, { status: 500 });
    }

    if (notes) {
      await updateProspectMeta(prospect.id, {
        restaurantName: prospect.restaurantName,
        currency: prospect.currency,
        detectedAddress: prospect.detectedAddress,
        commissionRatePct: prospect.commissionRatePct,
        assumedMonthlyOrders: prospect.assumedMonthlyOrders,
        notes,
      });
    }

    // Best-effort initial website audit if a real URL was provided
    if (sourceUrl && sourceUrl.startsWith("http")) {
      try {
        const audit = await runWebsiteAudit(sourceUrl.trim());
        await saveProspectAudit(prospect.id, audit);
        prospect.auditReport = audit;
      } catch (auditErr) {
        console.warn("[reach-webhook] audit initial en arrière-plan a échoué:", auditErr);
      }
    }

    const demoUrl = prospect.demoSlug ? getDemoUrl(prospect.demoSlug) : null;

    return NextResponse.json({
      success: true,
      prospect: {
        id: prospect.id,
        restaurantName: prospect.restaurantName,
        status: prospect.status,
        demoSlug: prospect.demoSlug,
        demoUrl,
        auditScore: prospect.auditReport?.score ?? null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
