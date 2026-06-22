"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icons: Record<string, React.ReactNode> = {
  grid: (
    <path
      d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  mail: (
    <path
      d="M3 7l9 6 9-6M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  layers: (
    <path
      d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  send: (
    <path
      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  key: (
    <path
      d="M21 2l-2 2m-7.6 5.6a5 5 0 11-1 1L15 5l3 3m-4-2l3 3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  webhook: (
    <path
      d="M18 16.98a4 4 0 10-3.3-6.27M6 9a4 4 0 105.3 5.73M9 18a4 4 0 105.3-5.73M12 8.5l-3 5.2m9 .3h-6m-1.5-5.2L8 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  users: (
    <path
      d="M17 20v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 2.13A4 4 0 0116 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  megaphone: (
    <path
      d="M3 11v2a1 1 0 001 1h2l4 4V7L6 11H4a1 1 0 00-1 0zM10 7l8-4v18l-8-4M18 8a3 3 0 010 6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.6 5.6l12.8 12.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  cog: (
    <>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.82 1.17V21a2 2 0 11-4 0v-.09A1.65 1.65 0 006.6 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 003.09 15H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9.4l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 6.6V6a2 2 0 114 0v.09A1.65 1.65 0 0017.4 7.6l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0021 12v.09"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export default function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: string;
}) {
  const pathname = usePathname();
  const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-white/[0.06] text-white"
          : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-fuchsia-400" />
      )}
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        className={active ? "text-indigo-300" : "text-neutral-500 group-hover:text-neutral-300"}
      >
        {icons[icon]}
      </svg>
      {label}
    </Link>
  );
}
