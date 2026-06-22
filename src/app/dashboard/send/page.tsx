"use client";

import { useState, useTransition } from "react";
import { sendFromDashboard } from "./actions";

const label = "mb-1 block text-sm text-neutral-300";

export default function SendPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  function action(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await sendFromDashboard(formData);
      setResult(res);
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Send a test email</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Sends through the active client&apos;s SMTP server and logs to Emails.
        </p>
      </header>

      {result && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            result.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-rose-400/30 bg-rose-400/10 text-rose-300"
          }`}
        >
          {result.message}
        </div>
      )}

      <form action={action} className="card max-w-xl space-y-4 p-6">
        <div>
          <label className={label}>To (comma-separated)</label>
          <input
            name="to"
            required
            placeholder="someone@example.com, other@example.com"
            className="field"
          />
        </div>
        <div>
          <label className={label}>Subject</label>
          <input name="subject" placeholder="Hello {{name}}" className="field" />
        </div>
        <div>
          <label className={label}>HTML body</label>
          <textarea
            name="html"
            rows={8}
            placeholder="<h1>Hi {{name}}</h1><p>...</p>"
            className="field font-mono"
          />
        </div>
        <div>
          <label className={label}>Variables (JSON, optional)</label>
          <textarea
            name="variables"
            rows={3}
            placeholder='{ "name": "Sam" }'
            className="field font-mono"
          />
        </div>
        <button disabled={pending} className="btn-primary">
          {pending ? "Sending…" : "Send email"}
        </button>
      </form>
    </div>
  );
}
