"use client";

import { useEffect, useRef, useState } from "react";
import {
  setActiveClient,
  createClientWorkspace,
  deleteClientWorkspace,
} from "./actions";
import type { Client } from "@/lib/clients";

export default function ClientSwitcher({
  clients,
  active,
}: {
  clients: Client[];
  active: Client;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
      >
        <Dot color={active.color} />
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-neutral-500">
            Client
          </span>
          <span className="block truncate text-sm font-medium text-neutral-100">
            {active.name}
          </span>
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`shrink-0 text-neutral-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-xl border border-white/10 bg-neutral-950/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="max-h-64 overflow-auto">
            {clients.map((c) => (
              <div key={c.id} className="group flex items-center gap-1">
                <form action={setActiveClient} className="flex-1">
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition hover:bg-white/[0.06] ${
                      c.id === active.id ? "text-white" : "text-neutral-300"
                    }`}
                  >
                    <Dot color={c.color} />
                    <span className="flex-1 truncate text-left">{c.name}</span>
                    {c.id === active.id && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </form>
                {clients.length > 1 && (
                  <form action={deleteClientWorkspace}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      title="Delete client"
                      className="rounded-md p-1.5 text-neutral-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M6 7h12M9 7V5h6v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>

          <div className="my-1 h-px bg-white/10" />

          {creating ? (
            <form action={createClientWorkspace} className="p-1">
              <input
                name="name"
                autoFocus
                required
                placeholder="New client name…"
                className="field"
              />
              <div className="mt-2 flex gap-1.5">
                <button type="submit" className="btn-primary flex-1 !py-1.5">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="btn-ghost !py-1.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-neutral-300 transition hover:bg-white/[0.06]"
            >
              <span className="grid h-4 w-4 place-items-center rounded-full border border-dashed border-neutral-600 text-neutral-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              New client
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-black/80"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        boxShadow: `0 2px 12px -2px ${color}80`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-black/40" />
    </span>
  );
}
