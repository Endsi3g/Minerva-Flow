import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export default async function FinancePage() {
  const locale = await getLocale();
  redirect({ href: "/fidelisation", locale });
}
