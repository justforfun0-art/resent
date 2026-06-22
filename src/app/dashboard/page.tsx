import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";

export default async function OverviewPage() {
  const supabase = await createClient();
  const client = await getActiveClient();
  const clientId = client?.id ?? "";

  const base = () =>
    supabase.from("emails").select("*", { count: "exact", head: true }).eq("client_id", clientId);

  const [{ count: total }, { count: sent }, { count: failed }, { count: keys }] =
    await Promise.all([
      base(),
      base().eq("status", "sent"),
      base().eq("status", "failed"),
      supabase
        .from("api_keys")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .is("revoked_at", null),
    ]);

  const delivered = sent ?? 0;
  const totalCount = total ?? 0;
  const rate = totalCount ? Math.round((delivered / totalCount) * 100) : 0;

  const stats = [
    { label: "Delivered", value: delivered, accent: "from-emerald-400/20 to-emerald-400/0", ring: "text-emerald-300" },
    { label: "Failed", value: failed ?? 0, accent: "from-rose-400/20 to-rose-400/0", ring: "text-rose-300" },
    { label: "Total logged", value: totalCount, accent: "from-indigo-400/20 to-indigo-400/0", ring: "text-indigo-300" },
    { label: "Active API keys", value: keys ?? 0, accent: "from-fuchsia-400/20 to-fuchsia-400/0", ring: "text-fuchsia-300" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: client?.color }}
          />
          {client?.name}
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Sending activity for this client.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card relative overflow-hidden p-5">
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.accent}`}
            />
            <div className="relative">
              <div className="text-3xl font-semibold tracking-tight">
                {s.value}
              </div>
              <div className={`mt-1 text-xs font-medium ${s.ring}`}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-neutral-300">
            Delivery rate
          </h2>
          <span className="text-sm font-semibold text-neutral-100">
            {rate}%
          </span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-indigo-400 transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {delivered} of {totalCount} logged emails delivered.
        </p>
      </div>

      <div className="card p-6">
        <h2 className="mb-3 font-medium">Quick start</h2>
        <ol className="space-y-2 text-sm text-neutral-400">
          {[
            { href: "/dashboard/settings", label: "Configure SMTP", rest: "for this client." },
            { href: "/dashboard/api-keys", label: "Create an API key", rest: "scoped to this client." },
            { href: "/dashboard/send", label: "Send a test", rest: "or call the API directly." },
          ].map((step, i) => (
            <li key={step.href} className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-neutral-300">
                {i + 1}
              </span>
              <span>
                <Link href={step.href} className="text-indigo-300 underline-offset-2 hover:underline">
                  {step.label}
                </Link>{" "}
                {step.rest}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
