import { getImapAccountStatus } from "@/lib/actions/imap";
import { ImapAccountForm } from "@/components/ImapAccountForm";
import { InboxScanner } from "@/components/InboxScanner";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const account = await getImapAccountStatus();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-white">Einstellungen</h1>

      <ImapAccountForm account={account} />
      <InboxScanner hasAccount={Boolean(account)} />
    </div>
  );
}
