import { useAppTheme } from "@/core/theme/app-theme-bridge";
import { AccountDeletionScreen } from "@/screens/settings/account-deletion-screen";

export default function AccountDeletionRoute() {
  const { danger, foreground } = useAppTheme();

  return <AccountDeletionScreen danger={danger} foreground={foreground} />;
}
