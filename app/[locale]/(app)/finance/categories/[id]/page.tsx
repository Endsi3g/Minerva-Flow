import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

// Finance is retired — see ../../page.tsx.
export default async function CategoryDetailPage() {
  redirect({ href: "/workspace", locale: await getLocale() });
}
