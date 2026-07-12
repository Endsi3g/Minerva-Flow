export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="11" fill="#167F5B" />
      <text
        x="14.5"
        y="29"
        fontFamily="Fraunces, serif"
        fontStyle="italic"
        fontWeight="600"
        fontSize="22"
        fill="#FBF9F3"
      >
        a
      </text>
      <path
        className="mv-leaf-breathe"
        style={{ transformOrigin: "26.5px 16.5px" }}
        d="M23 12.5C23 12.5 30 10.5 30.5 16.5C31 22.5 24 21 23 17.5C22.3 15 23 12.5 23 12.5Z"
        fill="#DFFF5F"
      />
      <path
        d="M23.3 17.2C24.5 15.4 27 13.6 30 13.2"
        stroke="#0E5A40"
        strokeWidth="0.9"
        strokeLinecap="round"
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
