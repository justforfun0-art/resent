import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import { dnsRecords } from "@/lib/dkim";
import { addDomain, deleteDomain } from "../actions";
import DomainCard from "./DomainCard";

export default async function DomainsPage() {
  const supabase = await createClient();
  const client = await getActiveClient();
  const { data: domains } = await supabase
    .from("domains")
    .select("*")
    .eq("client_id", client?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Domains</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Add a sending domain for{" "}
          <span className="text-neutral-200">{client?.name}</span>, then add the
          DNS records below. Verified domains get DKIM-signed automatically when
          you send from an address on that domain.
        </p>
      </header>

      <form action={addDomain} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1 min-w-[14rem]">
          <label className="mb-1 block text-sm text-neutral-300">Domain</label>
          <input
            name="name"
            required
            placeholder="mail.example.com"
            className="field"
          />
        </div>
        <button className="btn-primary">Add domain</button>
      </form>

      <div className="space-y-3">
        {(domains ?? []).map((d) => (
          <DomainCard
            key={d.id}
            domain={d}
            records={dnsRecords(d)}
            deleteAction={deleteDomain}
          />
        ))}
        {(domains ?? []).length === 0 && (
          <p className="px-1 text-sm text-neutral-500">No domains yet.</p>
        )}
      </div>
    </div>
  );
}
