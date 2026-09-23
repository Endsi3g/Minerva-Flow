import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const PRODUCT_UPDATES_SEGMENT_ID = "e284ea32-e32b-4d29-bd41-ffadf8586fb9";
export const ALL_ACCOUNTS_SEGMENT_ID = "c5b9b03c-273b-441e-bd47-22293f5f289a";

type ProductUpdatesContact = {
  email: string;
  fullName: string | null;
  optedIn: boolean;
  preferredLanguage?: string;
};

/**
 * Keeps Resend's account roster and explicit product-update segment aligned.
 * The account roster is always unsubscribed; only a user's explicit opt-in
 * makes their contact eligible for broadcasts.
 */
export async function syncProductUpdatesContact({
  email,
  fullName,
  optedIn,
  preferredLanguage = "fr",
}: ProductUpdatesContact): Promise<boolean> {
  if (!resend) return false;

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) return false;
  const existing = await resend.contacts.get({ email: trimmedEmail });

  if (!existing.data) {
    if (!optedIn) return true;
    const created = await resend.contacts.create({
      email: trimmedEmail,
      firstName: fullName?.trim() || undefined,
      properties: {
        preferred_language: preferredLanguage,
        product_updates_opt_in: "true",
      },
      unsubscribed: false,
      segments: [{ id: ALL_ACCOUNTS_SEGMENT_ID }, { id: PRODUCT_UPDATES_SEGMENT_ID }],
    });
    return !created.error;
  }

  const updated = await resend.contacts.update({
    email: trimmedEmail,
    firstName: fullName?.trim() || undefined,
    unsubscribed: !optedIn,
    properties: {
      preferred_language: preferredLanguage,
      product_updates_opt_in: String(optedIn),
    },
  });
  if (updated.error) return false;

  const { data: memberships, error: membershipsError } = await resend.contacts.segments.list({
    email: trimmedEmail,
  });
  if (membershipsError) return false;

  const hasAllAccounts = memberships?.data?.some((segment) => segment.id === ALL_ACCOUNTS_SEGMENT_ID);
  const hasProductUpdates = memberships?.data?.some((segment) => segment.id === PRODUCT_UPDATES_SEGMENT_ID);

  if (!hasAllAccounts) {
    const result = await resend.contacts.segments.add({
      email: trimmedEmail,
      segmentId: ALL_ACCOUNTS_SEGMENT_ID,
    });
    if (result.error) return false;
  }

  if (optedIn && !hasProductUpdates) {
    const result = await resend.contacts.segments.add({
      email: trimmedEmail,
      segmentId: PRODUCT_UPDATES_SEGMENT_ID,
    });
    if (result.error) return false;
  } else if (!optedIn && hasProductUpdates) {
    const result = await resend.contacts.segments.remove({
      email: trimmedEmail,
      segmentId: PRODUCT_UPDATES_SEGMENT_ID,
    });
    if (result.error) return false;
  }

  return true;
}
