import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/clients";
import SmtpForm from "./SmtpForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const client = await getActiveClient();
  const { data: cfg } = await supabase
    .from("smtp_configs")
    .select("*")
    .eq("client_id", client?.id ?? "")
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">SMTP Settings</h1>
        <p className="mt-1 text-sm text-neutral-400">
          The outbound mail server for{" "}
          <span className="text-neutral-200">{client?.name}</span>. Each client
          has its own. Works with any SMTP provider (SES SMTP, Mailgun,
          Postmark, Gmail, your own server).
        </p>
      </header>

      <SmtpForm cfg={cfg} />
    </div>
  );
}
