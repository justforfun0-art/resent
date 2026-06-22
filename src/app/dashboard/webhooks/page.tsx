import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import { toggleWebhook, deleteWebhook } from "../actions";
import CreateWebhookForm from "./CreateWebhookForm";

export default async function WebhooksPage() {
  const supabase = await createClient();
  const client = await getActiveClient();

  const { data: hooks } = await supabase
    .from("webhooks")
    .select("*")
    .eq("client_id", client?.id ?? "")
    .order("created_at", { ascending: false });

  // Recent delivery attempts across this client's webhooks (for debugging).
  const ids = (hooks ?? []).map((h) => h.id);
  const { data: deliveries } = ids.length
    ? await supabase
        .from("webhook_deliveries")
        .select("*")
        .in("webhook_id", ids)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Webhooks</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Get notified at your URL when emails are sent, fail, are opened, or
          clicked — for <span className="text-neutral-200">{client?.name}</span>.
          Payloads are signed with{" "}
          <code className="rounded bg-white/5 px-1 text-neutral-300">
            X-Resent-Signature
          </code>{" "}
          (HMAC-SHA256).
        </p>
      </header>

      <CreateWebhookForm />

      <div className="space-y-3">
        {(hooks ?? []).map((h) => (
          <div key={h.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      h.enabled ? "bg-emerald-400" : "bg-neutral-600"
                    }`}
                  />
                  <code className="truncate text-sm text-neutral-200">
                    {h.url}
                  </code>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(h.events as string[]).map((e) => (
                    <span
                      key={e}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-neutral-400"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <form action={toggleWebhook}>
                  <input type="hidden" name="id" value={h.id} />
                  <input type="hidden" name="enabled" value={String(h.enabled)} />
                  <button className="text-sm text-neutral-400 transition hover:text-neutral-200">
                    {h.enabled ? "Disable" : "Enable"}
                  </button>
                </form>
                <form action={deleteWebhook}>
                  <input type="hidden" name="id" value={h.id} />
                  <button className="text-sm text-rose-400 transition hover:text-rose-300">
                    Delete
                  </button>
                </form>
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-neutral-500">
                Signing secret
              </summary>
              <code className="mt-1 block break-all rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-neutral-300">
                {h.secret}
              </code>
            </details>
          </div>
        ))}
        {(hooks ?? []).length === 0 && (
          <p className="px-1 text-sm text-neutral-500">No webhooks yet.</p>
        )}
      </div>

      {(deliveries ?? []).length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-neutral-300">
            Recent deliveries
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Result</th>
                  <th className="px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {(deliveries ?? []).map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="px-5 py-3 text-neutral-300">{d.event}</td>
                    <td className="px-5 py-3">
                      {d.ok ? (
                        <span className="text-emerald-300">
                          {d.status_code ?? "OK"}
                        </span>
                      ) : (
                        <span className="text-rose-300">
                          {d.error ?? `HTTP ${d.status_code}`}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-400">
                      {new Date(d.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
