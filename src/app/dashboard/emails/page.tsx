import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";

const statusBadge: Record<string, string> = {
  sent: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  queued: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  suppressed: "border-neutral-500/30 bg-neutral-500/10 text-neutral-400",
  canceled: "border-neutral-500/30 bg-neutral-500/10 text-neutral-400",
};

export default async function EmailsPage() {
  const supabase = await createClient();
  const client = await getActiveClient();
  const { data: emails } = await supabase
    .from("emails")
    .select("*")
    .eq("client_id", client?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Emails</h1>
        <p className="mt-1 text-sm text-neutral-400">
          The 100 most recent sends for{" "}
          <span className="text-neutral-200">{client?.name}</span>.
        </p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">To</th>
              <th className="px-5 py-3 font-medium">Subject</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Engagement</th>
              <th className="px-5 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {(emails ?? []).map((e) => (
              <tr
                key={e.id}
                className="border-t border-white/5 align-top transition hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3.5 text-neutral-300">
                  {e.to_emails?.join(", ")}
                </td>
                <td className="px-5 py-3.5">
                  {e.subject || <span className="text-neutral-600">—</span>}
                  {e.status === "failed" && e.error && (
                    <div className="mt-1 text-xs text-rose-400/80">
                      {e.error}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      statusBadge[e.status] ?? "border-white/10 text-neutral-400"
                    }`}
                  >
                    {e.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-neutral-400">
                  <span className="inline-flex items-center gap-2">
                    <span
                      title={`${e.open_count ?? 0} opens`}
                      className={e.open_count ? "text-indigo-300" : ""}
                    >
                      👁 {e.open_count ?? 0}
                    </span>
                    <span
                      title={`${e.click_count ?? 0} clicks`}
                      className={e.click_count ? "text-fuchsia-300" : ""}
                    >
                      ↗ {e.click_count ?? 0}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-neutral-400">
                  {new Date(e.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(emails ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-neutral-500">
                  No emails sent yet for this client.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
