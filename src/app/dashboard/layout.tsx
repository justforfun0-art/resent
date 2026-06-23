import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listClients, getActiveClient, claimInvitations } from "@/lib/clients";
import { signOut } from "../(auth)/actions";
import ClientSwitcher from "./ClientSwitcher";
import NavLink from "./NavLink";

const nav = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/dashboard/emails", label: "Emails", icon: "mail" },
  { href: "/dashboard/templates", label: "Templates", icon: "layers" },
  { href: "/dashboard/send", label: "Send", icon: "send" },
  { href: "/dashboard/audiences", label: "Audiences", icon: "users" },
  { href: "/dashboard/broadcasts", label: "Broadcasts", icon: "megaphone" },
  { href: "/dashboard/api-keys", label: "API Keys", icon: "key" },
  { href: "/dashboard/domains", label: "Domains", icon: "globe" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: "webhook" },
  { href: "/dashboard/suppressions", label: "Suppressions", icon: "ban" },
  { href: "/dashboard/team", label: "Team", icon: "users" },
  { href: "/dashboard/settings", label: "SMTP Settings", icon: "cog" },
  { href: "/dashboard/docs", label: "Integration Guide", icon: "book" },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Accept any pending invites addressed to this user, then load clients.
  await claimInvitations();
  const [clients, active] = await Promise.all([
    listClients(),
    getActiveClient(),
  ]);

  return (
    <div className="flex min-h-screen text-neutral-100">
      <aside className="flex w-64 shrink-0 flex-col gap-4 border-r border-white/5 px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-black shadow-lg shadow-fuchsia-500/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 7l9 6 9-6M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight gradient-text">
            Resent
          </span>
        </Link>

        {active && <ClientSwitcher clients={clients} active={active} />}

        <nav className="flex-1 space-y-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
            />
          ))}
        </nav>

        <div className="border-t border-white/5 pt-4">
          <p className="mb-2 truncate px-2 text-xs text-neutral-500">
            {user?.email}
          </p>
          <form action={signOut}>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-neutral-400 transition hover:bg-white/[0.05] hover:text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 17l5-5-5-5M20 12H9M9 5H6a1 1 0 00-1 1v12a1 1 0 001 1h3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden px-10 py-10">
        <div className="mx-auto max-w-4xl rise">{children}</div>
      </main>
    </div>
  );
}
