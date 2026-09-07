import { NextResponse } from "next/server";
import { submitSurveyResponse } from "@/lib/data/announcements";
import { resolveNativeCustomer } from "@/lib/auth/native-bearer";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  let body: {
    announcementId?: string;
    customerId?: string;
    selectedOption?: string;
    feedbackText?: string;
    platform?: "web" | "ios";
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide" }, { status: 400 });
  }

  const { announcementId, selectedOption, feedbackText, platform = "web" } = body;

  if (!announcementId || !selectedOption) {
    return NextResponse.json(
      { ok: false, error: "announcementId et selectedOption sont requis." },
      { status: 400 }
    );
  }

  let userId: string | null = null;
  let customerId: string | null = body.customerId ?? null;

  if (platform === "ios") {
    const nativeCustomer = await resolveNativeCustomer(req);
    if (nativeCustomer) {
      customerId = nativeCustomer.id;
      userId = nativeCustomer.userId ?? null;
    }
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
    }
  }

  const result = await submitSurveyResponse({
    announcementId,
    userId,
    customerId,
    selectedOption,
    feedbackText,
    platform,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || "Échec de l'enregistrement" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
