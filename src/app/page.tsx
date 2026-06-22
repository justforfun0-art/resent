import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = !!user;
  } catch {
    // Misconfigured/unreachable Supabase — treat as signed out.
    signedIn = false;
  }
  redirect(signedIn ? "/dashboard" : "/login");
}
