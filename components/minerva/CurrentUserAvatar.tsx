"use client";

import { Avatar } from "@/components/minerva/PersonAvatar";
import { useApp } from "@/lib/app-context";
import { useCurrentUserImage } from "@/hooks/use-current-user-image";
import { useCurrentUserName } from "@/hooks/use-current-user-name";

/**
 * Supabase Auth-aware avatar. Prefers the server-fetched user from
 * AppContext (no waterfall); falls back to a live session lookup so it
 * also works outside the authenticated (app) layout.
 */
export function CurrentUserAvatar({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const { authUser } = useApp();
  const liveName = useCurrentUserName();
  const liveImage = useCurrentUserImage();

  const name = authUser?.fullName || liveName;
  return <Avatar name={name} size={size} className={className} src={liveImage} />;
}
