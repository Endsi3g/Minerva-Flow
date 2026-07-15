import { createClient } from "@/lib/supabase/server";

export type SupportCategory = "bug" | "amelioration" | "question";

export type CreateSupportRequestInput = {
  restaurantId: string | null;
  category: SupportCategory;
  subject: string;
  message: string;
};

export type SupportRequest = {
  id: string;
  category: SupportCategory;
  subject: string;
  message: string;
  status: "nouveau" | "en_cours" | "resolu";
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
};

/** The current user's own submitted tickets, replies included — so they can follow up without email. */
export async function getMySupportRequests(): Promise<SupportRequest[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("support_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (
    data as {
      id: string;
      category: SupportCategory;
      subject: string;
      message: string;
      status: "nouveau" | "en_cours" | "resolu";
      admin_reply: string | null;
      replied_at: string | null;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    category: r.category,
    subject: r.subject,
    message: r.message,
    status: r.status,
    adminReply: r.admin_reply,
    repliedAt: r.replied_at,
    createdAt: r.created_at,
  }));
}

export async function createSupportRequest(input: CreateSupportRequestInput): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("support_requests").insert({
    restaurant_id: input.restaurantId,
    user_id: user.id,
    category: input.category,
    subject: input.subject,
    message: input.message,
  });

  return !error;
}
