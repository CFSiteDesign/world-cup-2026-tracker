import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/", label: "Home" },
  { to: "/predict", label: "Predict" },
  { to: "/bracket", label: "Bracket" },
  { to: "/leaderboard", label: "Board" },
  { to: "/results", label: "Results" },
] as const;

export function MobileTabBar() {
  return (
    <nav
      aria-label="Primary"
      className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-background/90 backdrop-blur-xl hairline-t pb-[max(env(safe-area-inset-bottom),0.25rem)]"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => (
          <li key={t.to}>
            <Link
              to={t.to}
              activeOptions={{ exact: t.to === "/" }}
              activeProps={{ "data-active": "true" } as never}
              className="group flex flex-col items-center justify-center gap-1 px-1 py-2.5 font-display text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground transition-colors duration-200 data-[active=true]:text-pitch hover:text-foreground"
            >
              <TabIcon name={t.label} />
              <span className="leading-none">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TabIcon({ name }: { name: string }) {
  const s = "size-[18px]";
  const stroke = "currentColor";
  const sw = 2;
  switch (name) {
    case "Home":
      return (
        <svg className={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="square" aria-hidden="true">
          <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9z" />
        </svg>
      );
    case "Predict":
      return (
        <svg className={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="square" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h16" />
          <circle cx="18" cy="12" r="2" />
        </svg>
      );
    case "Bracket":
      return (
        <svg className={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="square" aria-hidden="true">
          <path d="M4 5h5v5M4 14h5v5M20 9h-4l-2 3 2 3h4" />
        </svg>
      );
    case "Board":
      return (
        <svg className={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="square" aria-hidden="true">
          <path d="M6 20V10M12 20V4M18 20v-7" />
        </svg>
      );
    case "Results":
      return (
        <svg className={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="square" aria-hidden="true">
          <path d="M5 4h14v6a7 7 0 0 1-14 0V4zM9 21h6M12 17v4" />
        </svg>
      );
    default:
      return null;
  }
}
