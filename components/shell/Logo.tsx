export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="256" height="256" rx="56" fill="#059669" />
      <path
        d="M 52 196 L 52 60 L 128 156 L 204 60 L 204 196"
        stroke="white"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display text-[17px] font-medium tracking-tight text-mv-ink">
        Minerva <span className="text-mv-green-dark">Flow</span>
      </span>
    </div>
  );
}
