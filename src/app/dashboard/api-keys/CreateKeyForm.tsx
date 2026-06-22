"use client";

import { useState } from "react";
import { createApiKey } from "../actions";

export default function CreateKeyForm() {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function action(formData: FormData) {
    const key = await createApiKey(formData);
    setNewKey(key);
    setCopied(false);
  }

  return (
    <div>
      <form action={action} className="mb-4 flex gap-2">
        <input
          name="name"
          placeholder="Key name (e.g. Production)"
          className="field flex-1"
        />
        <button className="btn-primary shrink-0">Create key</button>
      </form>

      {newKey && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <p className="mb-2 text-sm text-amber-200">
            Copy this key now — it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm">
              {newKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                setCopied(true);
              }}
              className="btn-ghost shrink-0"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
