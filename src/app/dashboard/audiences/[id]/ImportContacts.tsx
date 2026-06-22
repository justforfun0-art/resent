"use client";

import { useRef, useState, useTransition } from "react";
import { importContacts } from "../../actions";

export default function ImportContacts({ audienceId }: { audienceId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  function action(formData: FormData) {
    setResult(null);
    start(async () => {
      const res = await importContacts(formData);
      setResult(res);
      if (res.ok) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={action} className="card p-5">
      <input type="hidden" name="audience_id" value={audienceId} />
      <label className="mb-1 block text-sm text-neutral-300">
        Import from Excel or CSV
      </label>
      <p className="mb-3 text-xs text-neutral-500">
        First row must be a header containing an{" "}
        <code className="rounded bg-white/5 px-1 text-neutral-400">email</code>{" "}
        column. Optional:{" "}
        <code className="rounded bg-white/5 px-1 text-neutral-400">first_name</code>,{" "}
        <code className="rounded bg-white/5 px-1 text-neutral-400">last_name</code>.
        Existing contacts are updated, not duplicated.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          required
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          className="block text-sm text-neutral-300 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-neutral-200 hover:file:bg-white/15"
        />
        <button disabled={pending} className="btn-primary">
          {pending ? "Importing…" : "Import"}
        </button>
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
    </form>
  );
}
