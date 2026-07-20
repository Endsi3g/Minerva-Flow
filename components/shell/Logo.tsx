export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icon-512.png"
      alt="Minerva"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display text-[17px] font-medium tracking-tight text-mv-ink">
        Flow <span className="text-mv-green-dark">par Minerva</span>
      </span>
    </div>
  );
}
