import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addContact, removeContact } from "../../actions";
import ImportContacts from "./ImportContacts";

export default async function AudienceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: audience } = await supabase
    .from("audiences")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!audience) notFound();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("audience_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <Link href="/dashboard/audiences" className="text-sm text-neutral-500 hover:text-neutral-300">
          ← Audiences
        </Link>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{audience.name}</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {(contacts ?? []).length} contact{(contacts ?? []).length === 1 ? "" : "s"}
        </p>
      </header>

      <form action={addContact} className="card flex flex-wrap items-end gap-3 p-5">
        <input type="hidden" name="audience_id" value={id} />
        <div className="flex-1 min-w-[12rem]">
          <label className="mb-1 block text-sm text-neutral-300">Email</label>
          <input name="email" type="email" required placeholder="person@example.com" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">First name</label>
          <input name="first_name" placeholder="Sam" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Last name</label>
          <input name="last_name" placeholder="Lee" className="field" />
        </div>
        <button className="btn-primary">Add contact</button>
      </form>

      <ImportContacts audienceId={id} />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(contacts ?? []).map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="px-5 py-3.5 text-neutral-200">{c.email}</td>
                <td className="px-5 py-3.5 text-neutral-400">
                  {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-5 py-3.5">
                  {c.unsubscribed ? (
                    <span className="text-rose-300">Unsubscribed</span>
                  ) : (
                    <span className="text-emerald-300">Subscribed</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <form action={removeContact}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="audience_id" value={id} />
                    <button className="text-neutral-400 transition hover:text-neutral-200">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(contacts ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-14 text-center text-neutral-500">
                  No contacts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
