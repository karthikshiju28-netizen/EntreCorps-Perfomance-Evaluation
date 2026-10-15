// Recreation of the EntreCorps mark: navy disc, "EntreCORPS" wordmark, white + orange underline.
export function LogoMark({ size = 40, ring = false }: { size?: number; ring?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="EntreCorps" className="shrink-0">
      <circle cx="60" cy="60" r={ring ? 57 : 60} fill="#1b2a4a" stroke={ring ? 'rgb(255 255 255 / 0.35)' : 'none'} strokeWidth="6" />
      <text x="60" y="62" textAnchor="middle" fill="#fff" fontFamily="var(--font-sans), sans-serif"
        fontSize="17" fontWeight="600" letterSpacing="-0.2">
        Entre<tspan fontWeight="700">CORPS</tspan>
      </text>
      <rect x="13" y="69" width="94" height="3" fill="#fff" />
      <rect x="22" y="75" width="85" height="2" fill="#ff8a3d" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark ring={light} />
      <span className={`text-[15px] font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        EntreCorps <span className={light ? 'font-medium text-white/60' : 'font-medium text-muted'}>Evaluations</span>
      </span>
    </span>
  );
}
