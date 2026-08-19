"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared between the admin's QuickMenuEditor and the public demo page —
 * scraped image URLs are unverified third-party links (dead links, hotlink
 * protection, CORS-blocked redirects), so this always needs a graceful
 * fallback rather than a broken-image icon. Plain <img>, not next/image:
 * these come from arbitrary prospect domains that can't be pre-registered
 * in next.config's remotePatterns.
 */
export function MenuItemThumbnail({
  imageUrl,
  alt,
  size = 36,
  fallbackIcon: FallbackIcon = ImageOff,
  className,
  iconClassName,
}: {
  imageUrl?: string;
  alt: string;
  size?: number;
  fallbackIcon?: LucideIcon;
  className?: string;
  iconClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-mv-ink/[0.05] text-mv-ink-faint",
          className
        )}
        style={{ width: size, height: size }}
      >
        <FallbackIcon size={Math.round(size * 0.4)} className={iconClassName} />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      className={cn("shrink-0 rounded-lg object-cover", className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
}
