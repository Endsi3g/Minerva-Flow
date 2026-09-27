import { notFound } from "next/navigation";
import { CustomerSignUp } from "./CustomerSignUp";

export default async function CustomerSignUpPage({ searchParams }: { searchParams: Promise<{ restaurant?: string; menu?: string }> }) {
  const query = await searchParams;
  const restaurantId = query.restaurant ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(restaurantId)) notFound();
  const menuToken = query.menu && /^[a-z0-9_-]{8,100}$/i.test(query.menu) ? query.menu : null;
  return <CustomerSignUp restaurantId={restaurantId} menuToken={menuToken} />;
}
