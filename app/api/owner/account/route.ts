import { NextResponse } from "next/server";
import { resolveNativeUserId } from "@/lib/auth/native-bearer";
import { deleteAccountForUser } from "@/lib/data/account-deletion";

/**
 * Account deletion for the native owner app, over a Bearer token. Runs the same
 * erasure as the web profile page, including the protection that blocks a sole
 * owner of a restaurant (409 with the reason, so the app can show it). The app
 * has already asked the person to confirm; this is irreversible.
 */
export async function DELETE(req: Request) {
  const userId = await resolveNativeUserId(req);
  if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const result = await deleteAccountForUser(userId, null);
  if (result.ok) return NextResponse.json({ ok: true });

  const soleOwner = result.error.startsWith("Vous êtes le seul propriétaire");
  return NextResponse.json({ ok: false, error: result.error }, { status: soleOwner ? 409 : 500 });
}
