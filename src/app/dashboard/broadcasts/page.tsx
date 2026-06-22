import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import { createBroadcast, deleteBroadcast } from "../actions";
import SendBroadcastButton from "./SendBroadcastButton";

const statusBadge: Record<string, string> = {
  draft: "border-white/10 bg-white/5 text-neutral-400",
  sending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  sent: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
};

export default async function BroadcastsPage() {
  const supabase = await createClient();
  const client = await getActiveClient();

  const [{ data: broadcasts }, { data: audiences }] = await Promise.all([
    supabase
      .from("broadcasts")
      .select("*, audiences(name)")
      .eq("client_id", client?.id ?? "")
      .order("created_at", { ascending: false }),
    supabase
      .from("audiences")
      .select("id, name")
      .eq("client_id", client?.id ?? ""),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Broadcasts</h1>
        <p className="mt-1 text-sm text-neutral-400">
          One-off campaigns to an audience. Bodies can use{" "}
          <code className="rounded bg-white/5 px-1 text-neutral-300">{`{{first_name}}`}</code>,{" "}
          <code className="rounded bg-white/5 px-1 text-neutral-300">{`{{email}}`}</code>.
        </p>
      </header>

      {(audiences ?? []).length === 0 ? (
        <div className="card p-5 text-sm text-neutral-400">
          Create an audience first under{" "}
          <Link href="/dashboard/audiences" className="text-indigo-300 hover:underline">
            Audiences
          </Link>
          .
        </div>
      ) : (
        <details className="card">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-neutral-200">
            + New broadcast
          </summary>
          <form action={createBroadcast} className="space-y-3 p-5 pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-neutral-300">Name</label>
                <input name="name" required placeholder="March newsletter" className="field" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-neutral-300">Audience</label>
                <select name="audience_id" required className="field">
                  {(audiences ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">Subject</label>
              <input name="subject" placeholder="Hi {{first_name}}!" className="field" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">HTML body</label>
              <textarea name="html" rows={6} placeholder="<h1>Hello {{first_name}}</h1>" className="field font-mono" />
            </div>
            <button className="btn-primary">Save draft</button>
          </form>
        </details>
      )}

      <div className="space-y-3">
        {(broadcasts ?? []).map((b) => (
          <div key={b.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-100">{b.name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge[b.status] ?? statusBadge.draft}`}>
                    {b.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {b.audiences?.name ?? "—"} · {b.subject || "no subject"}
                  {b.status === "sent" && ` · sent to ${b.sent_count}`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {b.status !== "sent" && <SendBroadcastButton id={b.id} />}
                <form action={deleteBroadcast}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="text-sm text-rose-400 transition hover:text-rose-300">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {(broadcasts ?? []).length === 0 && (
          <p className="px-1 text-sm text-neutral-500">No broadcasts yet.</p>
        )}
      </div>
    </div>
  );
}
