import { Suspense } from "react";
import { getMyProfile } from "@/lib/data/profile";
import { getCurrentMembership } from "@/lib/data/current-restaurant";
import { getActivityLog } from "@/lib/data/activity";
import { ProfileView } from "./ProfileView";

export default async function ProfilPage() {
  const [profile, membership] = await Promise.all([getMyProfile(), getCurrentMembership()]);

  const activity =
    profile && membership
      ? await getActivityLog(membership.restaurantId, { actorId: profile.id, limit: 50 })
      : [];

  return (
    <Suspense>
      <ProfileView profile={profile} role={membership?.role ?? null} activity={activity} />
    </Suspense>
  );
}
