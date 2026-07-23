import * as React from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
} from "minerva-flow";
import { Check } from "lucide-react";

// Matches the app's own staff-initial palette (see
// components/minerva/PersonAvatar.tsx) — applied inline since arbitrary
// Tailwind hex classes aren't picked up by this preview pipeline.

export function Default() {
  return (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback style={{ background: "#4A6FA5" }} className="text-mv-cream-soft">
          MT
        </AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback style={{ background: "#AB7D1F" }} className="text-mv-cream-soft">
          SB
        </AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback style={{ background: "#7D5BA6" }} className="text-mv-cream-soft">
          JC
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

export function WithBadge() {
  return (
    <Avatar size="lg">
      <AvatarFallback style={{ background: "#3E7C7C" }} className="text-mv-cream-soft">
        AL
      </AvatarFallback>
      <AvatarBadge className="bg-mv-green">
        <Check />
      </AvatarBadge>
    </Avatar>
  );
}

export function Group() {
  return (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback style={{ background: "#4A6FA5" }} className="text-mv-cream-soft">
          MT
        </AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback style={{ background: "#AB7D1F" }} className="text-mv-cream-soft">
          SB
        </AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback style={{ background: "#B5473A" }} className="text-mv-cream-soft">
          JC
        </AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+4</AvatarGroupCount>
    </AvatarGroup>
  );
}
