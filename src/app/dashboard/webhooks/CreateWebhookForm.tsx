"use client";

import { useState, useTransition } from "react";
import { createWebhook } from "../actions";

const EVENTS = [
  { value: "email.sent", label: "Sent" },
  { value: "email.failed", label: "Failed" },
  { value: "email.opened", label: "Opened" },
  { value: "email.clicked", label: "Clicked" },
];

export default function CreateWebhookForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function action(formData: FormData) {
    setError(null);
    start(async () => {
      try {
        await createWebhook(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create webhook");
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        Add endpoint
      </button>
    );
  }

  return (
    <form action={action} className="card space-y-4 p-5">
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Endpoint URL</label>
        <input
          name="url"
          required
          placeholder="https://your-app.com/webhooks/resent"
          className="field"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm text-neutral-300">Events</label>
        <div className="flex flex-wrap gap-3">
          {EVENTS.map((e) => (
            <label
              key={e.value}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-300"
            >
              <input
                type="checkbox"
                name={e.value}
                defaultChecked
                className="accent-indigo-400"
              />
              {e.label}
            </label>
          ))}
        </div>
      </div>
      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Create webhook"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
