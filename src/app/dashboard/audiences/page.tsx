import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import { createAudience, deleteAudience } from "../actions";

export default async function AudiencesPage() {
  const supabase = await createClient();
  const client = await getActiveClient();
  const { data: audiences } = await supabase
    .from("audiences")
    .select("*, contacts(count)")
    .eq("client_id", client?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Audiences</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Contact lists for <span className="text-neutral-200">{client?.name}</span>.
          Send a <Link href="/dashboard/broadcasts" className="text-indigo-300 hover:underline">broadcast</Link> to one.
        </p>
      </header>

      <form action={createAudience} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1 min-w-[14rem]">
          <label className="mb-1 block text-sm text-neutral-300">Name</label>
          <input name="name" required placeholder="Newsletter subscribers" className="field" />
        </div>
        <button className="btn-primary">Create audience</button>
      </form>

      <div className="space-y-3">
        {(audiences ?? []).map((a) => {
          const count = Array.isArray(a.contacts) ? a.contacts[0]?.count ?? 0 : 0;
          return (
            <div key={a.id} className="card flex items-center justify-between p-5">
              <Link href={`/dashboard/audiences/${a.id}`} className="min-w-0">
                <div className="font-medium text-neutral-100">{a.name}</div>
                <div className="mt-0.5 text-xs text-neutral-500">
                  {count} contact{count === 1 ? "" : "s"}
                </div>
              </Link>
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/audiences/${a.id}`}
                  className="text-sm text-indigo-300 transition hover:text-indigo-200"
                >
                  Manage
                </Link>
                <form action={deleteAudience}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-sm text-rose-400 transition hover:text-rose-300">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {(audiences ?? []).length === 0 && (
          <p className="px-1 text-sm text-neutral-500">No audiences yet.</p>
        )}
      </div>
    </div>
  );
}
