import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { deleteMyAccount } from "@/lib/data/customer-portal";

/**
 * Bridge for the native app's "Supprimer mon compte" action — same
 * deleteMyAccount the web portal's deleteMyAccountAction calls, reached
 * over a Bearer token instead of a session cookie. Irreversible: the
 * client is expected to have already confirmed with the person before
 * calling this.
 */
export async function DELETE(req: Request) {
  const userId = await resolveNativeUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const ok = await deleteMyAccount(userId);
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
