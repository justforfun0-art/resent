"use client";

import { useState, useTransition } from "react";
import { saveSmtpConfig, testSmtpConnection } from "../actions";

const label = "mb-1 block text-sm text-neutral-300";

type Config = {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  from_email?: string;
  from_name?: string | null;
} | null;

export default function SmtpForm({ cfg }: { cfg: Config }) {
  const [port, setPort] = useState<number>(cfg?.port ?? 587);
  const [saved, setSaved] = useState(false);
  const [pendingTest, startTest] = useTransition();
  const [pendingSave, startSave] = useTransition();
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  // 465 = implicit TLS; everything else = STARTTLS. Shown so the user knows
  // the secure mode is handled automatically from the port.
  const secureMode = port === 465 ? "TLS/SSL (implicit)" : "STARTTLS";

  function handleSave(formData: FormData) {
    setSaved(false);
    setTest(null);
    startSave(async () => {
      await saveSmtpConfig(formData);
      setSaved(true);
    });
  }

  function handleTest(formData: FormData) {
    setTest(null);
    setSaved(false);
    startTest(async () => {
      const res = await testSmtpConnection(formData);
      setTest(res);
    });
  }

  return (
    <form className="card max-w-xl space-y-4 p-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className={label}>Host</label>
          <input
            name="host"
            required
            defaultValue={cfg?.host}
            placeholder="smtp.gmail.com"
            className="field"
          />
        </div>
        <div>
          <label className={label}>Port</label>
          <input
            name="port"
            type="number"
            value={port}
            onChange={(e) => setPort(Number(e.target.value))}
            className="field"
          />
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Security mode is set automatically from the port:{" "}
        <span className="text-neutral-300">{secureMode}</span>. Use{" "}
        <span className="text-neutral-300">465</span> for Gmail.
      </p>

      <div>
        <label className={label}>Username</label>
        <input
          name="username"
          required
          defaultValue={cfg?.username}
          placeholder="you@gmail.com"
          className="field"
        />
      </div>

      <div>
        <label className={label}>Password</label>
        <input
          name="password"
          type="password"
          required={!cfg}
          autoComplete="new-password"
          placeholder={cfg ? "Leave blank to keep current password" : "16-char app password"}
          className="field"
        />
        <p className="text-xs text-neutral-500 mt-1">
          Gmail requires a 16-character{" "}
          <a
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noreferrer"
            className="underline text-neutral-300"
          >
            app password
          </a>
          , not your normal password. Spaces are removed automatically.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>From email</label>
          <input
            name="from_email"
            type="email"
            required
            defaultValue={cfg?.from_email}
            placeholder="you@gmail.com"
            className="field"
          />
        </div>
        <div>
          <label className={label}>From name (optional)</label>
          <input
            name="from_name"
            defaultValue={cfg?.from_name ?? ""}
            placeholder="Your Company"
            className="field"
          />
        </div>
      </div>

      {test && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            test.ok
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-rose-400/30 bg-rose-400/10 text-rose-300"
          }`}
        >
          {test.message}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          Settings saved.
        </div>
      )}

      <div className="flex gap-2">
        <button
          formAction={handleSave}
          disabled={pendingSave}
          className="btn-primary"
        >
          {pendingSave ? "Saving…" : "Save settings"}
        </button>
        <button
          formAction={handleTest}
          disabled={pendingTest}
          className="btn-ghost"
        >
          {pendingTest ? "Testing…" : "Test connection"}
        </button>
      </div>
    </form>
  );
}
