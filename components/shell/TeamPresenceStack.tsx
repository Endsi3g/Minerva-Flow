"use client";

import { usePresenceMembers } from "@/lib/presence/context";
import { Avatar } from "@/components/minerva/PersonAvatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const MAX_VISIBLE = 4;

/**
 * Who's online right now, and what they're looking at — an avatar stack to
 * the left of the search bar (Figma/Google Docs pattern), tooltip per
 * avatar showing name + current page. Hidden entirely when you're the only
 * one connected, since "1 person online: you" isn't useful information.
 */
export function TeamPresenceStack() {
  const members = usePresenceMembers();
  if (members.length < 2) return null;

  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((member) => (
        <Tooltip key={member.userId}>
          <TooltipTrigger className="rounded-full ring-2 ring-mv-cream-soft transition-transform hover:z-10 hover:-translate-y-0.5">
            <Avatar name={member.name} size={28} src={member.avatarUrl} />
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="font-semibold">{member.name}</span> — {member.pageLabel}
          </TooltipContent>
        </Tooltip>
      ))}
      {overflow > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mv-ink/10 text-[11px] font-semibold text-mv-ink-soft ring-2 ring-mv-cream-soft">
          +{overflow}
        </div>
      )}
    </div>
  );
}
