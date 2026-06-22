import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId } from "@/lib/clients";
import {
  inviteMember,
  revokeInvitation,
  changeMemberRole,
  removeMember,
} from "../actions";

const roleBadge: Record<string, string> = {
  owner: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-300",
  admin: "border-indigo-400/30 bg-indigo-400/10 text-indigo-300",
  member: "border-white/10 bg-white/5 text-neutral-400",
};

export default async function TeamPage() {
  const supabase = await createClient();
  const orgId = await getActiveOrgId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("memberships")
      .select("*")
      .eq("org_id", orgId ?? "")
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("*")
      .eq("org_id", orgId ?? "")
      .order("created_at", { ascending: false }),
  ]);

  // Fetch member emails via the admin API isn't available client-side; we show
  // the user id, marking the current user.
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Invite teammates to your organization. Members share access to all of
          the org&apos;s clients. An invite is accepted simply by signing in with
          the invited email.
        </p>
      </header>

      <form action={inviteMember} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1 min-w-[14rem]">
          <label className="mb-1 block text-sm text-neutral-300">Email</label>
          <input name="email" type="email" required placeholder="teammate@example.com" className="field" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-neutral-300">Role</label>
          <select name="role" className="field">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className="btn-primary">Send invite</button>
      </form>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-300">Members</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5 text-left text-xs uppercase tracking-wider text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(members ?? []).map((m) => {
                const isSelf = m.user_id === user?.id;
                return (
                  <tr key={m.id} className="border-t border-white/5">
                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-300">
                      {isSelf ? `${user?.email} (you)` : m.user_id}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${roleBadge[m.role] ?? roleBadge.member}`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {m.role !== "owner" && (
                        <div className="flex items-center justify-end gap-3">
                          <form action={changeMemberRole}>
                            <input type="hidden" name="id" value={m.id} />
                            <input
                              type="hidden"
                              name="role"
                              value={m.role === "admin" ? "member" : "admin"}
                            />
                            <button className="text-neutral-400 transition hover:text-neutral-200">
                              Make {m.role === "admin" ? "member" : "admin"}
                            </button>
                          </form>
                          <form action={removeMember}>
                            <input type="hidden" name="id" value={m.id} />
                            <button className="text-rose-400 transition hover:text-rose-300">
                              Remove
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(invites ?? []).length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-neutral-300">Pending invites</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {(invites ?? []).map((i) => (
                  <tr key={i.id} className="border-t border-white/5 first:border-t-0">
                    <td className="px-5 py-3.5 text-neutral-200">{i.email}</td>
                    <td className="px-5 py-3.5 text-neutral-400">{i.role}</td>
                    <td className="px-5 py-3.5 text-right">
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={i.id} />
                        <button className="text-rose-400 transition hover:text-rose-300">
                          Revoke
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
