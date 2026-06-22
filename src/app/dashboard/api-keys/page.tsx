import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import { revokeApiKey } from "../actions";
import CreateKeyForm from "./CreateKeyForm";

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const client = await getActiveClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("client_id", client?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">API Keys</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Keys for <span className="text-neutral-200">{client?.name}</span>.
          Authenticate the send API with{" "}
          <code className="rounded bg-white/5 px-1 text-neutral-300">
            Authorization: Bearer &lt;key&gt;
          </code>
          .
        </p>
      </header>

      <CreateKeyForm />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Prefix</th>
              <th className="px-5 py-3 font-medium">Last used</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(keys ?? []).map((k) => (
              <tr key={k.id} className="border-t border-white/5 transition hover:bg-white/[0.02]">
                <td className="px-5 py-3.5">{k.name}</td>
                <td className="px-5 py-3.5 font-mono text-neutral-400">
                  {k.key_prefix}…
                </td>
                <td className="px-5 py-3.5 text-neutral-400">
                  {k.last_used_at
                    ? new Date(k.last_used_at).toLocaleString()
                    : "—"}
                </td>
                <td className="px-5 py-3.5">
                  {k.revoked_at ? (
                    <span className="inline-flex rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-xs font-medium text-rose-300">
                      Revoked
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {!k.revoked_at && (
                    <form action={revokeApiKey}>
                      <input type="hidden" name="id" value={k.id} />
                      <button className="text-rose-400 transition hover:text-rose-300">
                        Revoke
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {(keys ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-neutral-500">
                  No API keys yet for this client.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
