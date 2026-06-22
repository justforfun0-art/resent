import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Client = {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  slug: string;
  color: string;
  created_at: string;
};

// Resolve the user's organization id, creating a personal org (with the user as
// owner) the first time. Used so new clients are attached to an org and become
// visible to teammates.
export async function getActiveOrgId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("memberships")
    .select("org_id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (existing && existing.length > 0) return existing[0].org_id;

  // Bootstrap a personal org + owner membership.
  const { data: org } = await supabase
    .from("organizations")
    .insert({ name: "Personal" })
    .select("id")
    .single();
  if (!org) return null;
  await supabase
    .from("memberships")
    .insert({ org_id: org.id, user_id: user.id, role: "owner" });
  return org.id;
}

export const ACTIVE_CLIENT_COOKIE = "resent_client";

// A small palette used when creating clients without a chosen color.
export const CLIENT_COLORS = [
  "#6366f1", // indigo
  "#ec4899", // pink
  "#22d3ee", // cyan
  "#f59e0b", // amber
  "#10b981", // emerald
  "#a855f7", // purple
  "#ef4444", // red
];

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "client"
  );
}

// Load all of the current user's clients (newest-owned first by creation).
export async function listClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as Client[]) ?? [];
}

// Turn any pending invitations addressed to the current user's email into
// memberships. Idempotent; called on dashboard load so accepting an invite is
// just "log in." Uses the service client because invitations for an org the
// user isn't yet in aren't visible under their own RLS.
export async function claimInvitations(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  const { createServiceClient } = await import("@/lib/supabase/server");
  const db = createServiceClient();
  const email = user.email.toLowerCase();

  const { data: invites } = await db
    .from("invitations")
    .select("id, org_id, role")
    .eq("email", email);
  if (!invites || invites.length === 0) return;

  for (const inv of invites) {
    await db
      .from("memberships")
      .upsert(
        { org_id: inv.org_id, user_id: user.id, role: inv.role },
        { onConflict: "org_id,user_id" }
      );
    await db.from("invitations").delete().eq("id", inv.id);
  }
}

// Resolve the active client for this request. Falls back to the cookie's client
// if it still belongs to the user, otherwise the first client. If the user has
// no clients yet, one named "Default" is created automatically.
export async function getActiveClient(): Promise<Client | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  let clients = await listClients();

  if (clients.length === 0) {
    const orgId = await getActiveOrgId();
    const { data: created } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        org_id: orgId,
        name: "Default",
        slug: "default",
        color: CLIENT_COLORS[0],
      })
      .select("*")
      .single();
    if (created) clients = [created as Client];
  }
  if (clients.length === 0) return null;

  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_CLIENT_COOKIE)?.value;
  return clients.find((c) => c.id === wanted) ?? clients[0];
}
