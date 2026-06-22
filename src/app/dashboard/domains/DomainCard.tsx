"use client";

import { useState, useTransition } from "react";
import { verifyDomain } from "../actions";

type DnsRecord = { type: string; host: string; value: string; purpose: string };
type Domain = { id: string; name: string; verified: boolean };

export default function DomainCard({
  domain,
  records,
  deleteAction,
}: {
  domain: Domain;
  records: DnsRecord[];
  deleteAction: (formData: FormData) => void;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  function check() {
    setResult(null);
    start(async () => {
      const fd = new FormData();
      fd.set("id", domain.id);
      setResult(await verifyDomain(fd));
    });
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              domain.verified ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          <span className="font-medium text-neutral-100">{domain.name}</span>
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
              domain.verified
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-300"
            }`}
          >
            {domain.verified ? "Verified" : "Pending"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!domain.verified && (
            <button
              onClick={check}
              disabled={pending}
              className="text-sm text-indigo-300 transition hover:text-indigo-200 disabled:opacity-50"
            >
              {pending ? "Checking…" : "Verify"}
            </button>
          )}
          <form action={deleteAction}>
            <input type="hidden" name="id" value={domain.id} />
            <button className="text-sm text-rose-400 transition hover:text-rose-300">
              Delete
            </button>
          </form>
        </div>
      </div>

      {result && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            result.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-rose-400/30 bg-rose-400/10 text-rose-300"
          }`}
        >
          {result.message}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-neutral-500">
            <tr>
              <th className="py-1 pr-4 font-medium">Type</th>
              <th className="py-1 pr-4 font-medium">Host</th>
              <th className="py-1 pr-4 font-medium">Value</th>
            </tr>
          </thead>
          <tbody className="font-mono text-neutral-300">
            {records.map((r) => (
              <tr key={r.host} className="border-t border-white/5 align-top">
                <td className="py-2 pr-4">{r.type}</td>
                <td className="py-2 pr-4 break-all">{r.host}</td>
                <td className="py-2 pr-4 break-all">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
