"use client";

import { useState, useTransition } from "react";
import { sendBroadcast } from "../actions";

export default function SendBroadcastButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);

  function send() {
    if (!confirm("Send this broadcast to all subscribed contacts?")) return;
    setMsg(null);
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      setMsg(await sendBroadcast(fd));
    });
  }

  return (
    <span className="flex items-center gap-2">
      {msg && (
        <span className={`text-xs ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>
          {msg.message}
        </span>
      )}
      <button
        onClick={send}
        disabled={pending}
        className="text-sm text-indigo-300 transition hover:text-indigo-200 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send"}
      </button>
    </span>
  );
}
