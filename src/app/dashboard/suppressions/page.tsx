import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import { addSuppression, removeSuppression } from "../actions";

const reasonBadge: Record<string, string> = {
  hard_bounce: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  complaint: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  manual: "border-white/10 bg-white/5 text-neutral-400",
};

export default async function SuppressionsPage() {
  const supabase = await createClient();
  const client = await getActiveClient();
  const { data: rows } = await supabase
    .from("suppressions")
    .select("*")
    .eq("client_id", client?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Suppressions</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Addresses <span className="text-neutral-200">{client?.name}</span> will
          never email. Any send to a suppressed recipient is logged as{" "}
          <code className="rounded bg-white/5 px-1 text-neutral-300">suppressed</code>{" "}
          and skipped.
        </p>
      </header>

      <form action={addSuppression} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1 min-w-[12rem]">
          <label className="mb-1 block text-sm text-neutral-300">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="blocked@example.com"
            className="field"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Reason</label>
          <select name="reason" className="field">
            <option value="manual">Manual</option>
            <option value="hard_bounce">Hard bounce</option>
            <option value="complaint">Complaint</option>
          </select>
        </div>
        <button className="btn-primary">Suppress</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Reason</th>
              <th className="px-5 py-3 font-medium">Added</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="border-t border-white/5 transition hover:bg-white/[0.02]">
                <td className="px-5 py-3.5 text-neutral-200">{r.email}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                      reasonBadge[r.reason] ?? reasonBadge.manual
                    }`}
                  >
                    {r.reason}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-neutral-400">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <form action={removeSuppression}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="text-neutral-400 transition hover:text-neutral-200">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-14 text-center text-neutral-500">
                  No suppressed addresses.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
