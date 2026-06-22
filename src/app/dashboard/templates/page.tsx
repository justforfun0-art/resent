import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import { upsertTemplate, deleteTemplate, addStarterTemplate } from "../actions";
import { STARTER_TEMPLATES } from "@/lib/starter-templates";

const label = "mb-1 block text-sm text-neutral-300";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const client = await getActiveClient();
  const { data: templates } = await supabase
    .from("templates")
    .select("*")
    .eq("client_id", client?.id ?? "")
    .order("updated_at", { ascending: false });

  // A starter is "added" if a template with its slug (or a numbered variant)
  // already exists in this client.
  const existingSlugs = new Set((templates ?? []).map((t) => t.slug));
  const isAdded = (slug: string) =>
    existingSlugs.has(slug) ||
    [...existingSlugs].some((s) => s.startsWith(`${slug}-`));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Reusable bodies for{" "}
          <span className="text-neutral-200">{client?.name}</span>. Use{" "}
          <code className="rounded bg-white/5 px-1 text-neutral-300">{`{{variable}}`}</code>{" "}
          placeholders, then pass{" "}
          <code className="rounded bg-white/5 px-1 text-neutral-300">variables</code>{" "}
          when sending.
        </p>
      </header>

      <details className="card group">
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-medium text-neutral-200">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 text-black">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </span>
          New template
        </summary>
        <form action={upsertTemplate} className="space-y-3 p-5 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Name</label>
              <input name="name" required placeholder="Welcome email" className="field" />
            </div>
            <div>
              <label className={label}>Slug (used in API)</label>
              <input name="slug" required placeholder="welcome" className="field" />
            </div>
          </div>
          <div>
            <label className={label}>Subject</label>
            <input name="subject" placeholder="Welcome, {{name}}!" className="field" />
          </div>
          <div>
            <label className={label}>HTML body</label>
            <textarea
              name="html"
              rows={6}
              placeholder="<h1>Hi {{name}}</h1>"
              className="field font-mono"
            />
          </div>
          <button className="btn-primary">Save template</button>
        </form>
      </details>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-300">
            Starter templates
          </h2>
          <span className="text-xs text-neutral-500">
            polished, ready-to-edit designs
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {STARTER_TEMPLATES.map((s) => {
            const added = isAdded(s.slug);
            return (
              <div key={s.slug} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-neutral-100">{s.name}</div>
                    <p className="mt-0.5 text-xs leading-5 text-neutral-400">
                      {s.description}
                    </p>
                  </div>
                  <code className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-xs text-neutral-400">
                    {s.slug}
                  </code>
                </div>
                <div className="mt-auto">
                  {added ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 13l4 4L19 7"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Added — add another?
                    </span>
                  ) : null}
                  <form action={addStarterTemplate} className={added ? "mt-1" : ""}>
                    <input type="hidden" name="slug" value={s.slug} />
                    <button
                      className={
                        added ? "btn-ghost !py-1.5 text-xs" : "btn-primary !py-1.5"
                      }
                    >
                      {added ? "Add a copy" : "Add to client"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-300">Your templates</h2>
        {(templates ?? []).map((t) => (
          <details key={t.id} className="card">
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
              <span className="font-medium">{t.name}</span>
              <code className="rounded bg-white/5 px-2 py-0.5 text-xs text-neutral-400">
                {t.slug}
              </code>
            </summary>
            <form action={upsertTemplate} className="space-y-3 p-5 pt-0">
              <input type="hidden" name="id" value={t.id} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Name</label>
                  <input name="name" required defaultValue={t.name} className="field" />
                </div>
                <div>
                  <label className={label}>Slug</label>
                  <input name="slug" required defaultValue={t.slug} className="field" />
                </div>
              </div>
              <div>
                <label className={label}>Subject</label>
                <input name="subject" defaultValue={t.subject} className="field" />
              </div>
              <div>
                <label className={label}>HTML body</label>
                <textarea name="html" rows={6} defaultValue={t.html} className="field font-mono" />
              </div>
              <button className="btn-primary">Save</button>
            </form>
            <form action={deleteTemplate} className="px-5 pb-5">
              <input type="hidden" name="id" value={t.id} />
              <button className="text-sm text-rose-400 transition hover:text-rose-300">
                Delete template
              </button>
            </form>
          </details>
        ))}
        {(templates ?? []).length === 0 && (
          <p className="px-1 text-sm text-neutral-500">No templates yet.</p>
        )}
      </div>
    </div>
  );
}
