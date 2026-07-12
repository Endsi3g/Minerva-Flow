import { Avatar as ShadcnAvatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

// Deliberately excludes the Minerva brand green (#167F5B/#0E5A40) so a
// person's avatar is never mistaken for the logo mark or an "active" state.
const palette = [
  "#4A6FA5",
  "#AB7D1F",
  "#B5473A",
  "#7D5BA6",
  "#3E7C7C",
  "#565F52",
];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({
  name,
  size = 32,
  className,
  src,
}: {
  name: string;
  size?: number;
  className?: string;
  src?: string | null;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = palette[hash(name) % palette.length];

  return (
    <ShadcnAvatar
      className={cn("shrink-0 after:border-transparent", className)}
      style={{ width: size, height: size }}
    >
      {src && <AvatarImage src={src} alt={name} />}
      <AvatarFallback
        className="font-semibold text-mv-cream-soft"
        style={{ background: color, fontSize: size * 0.38 }}
      >
        {initials}
      </AvatarFallback>
    </ShadcnAvatar>
  );
}
