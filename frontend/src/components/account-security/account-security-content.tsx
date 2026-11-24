"use client";

import { useCurrentUser } from "@/api/auth";
import { AccountSecurityError } from "@/components/account-security/account-security-error";
import { AccountSecuritySkeleton } from "@/components/account-security/account-security-skeleton";
import { ConnectedAccountsCard } from "@/components/account-security/connected-accounts-card";
import { EmailCard } from "@/components/account-security/email-card";
import { PasswordCard } from "@/components/account-security/password-card";
import { SessionsCard } from "@/components/account-security/sessions-card";

/** The four cards, driven by the signed-in user's profile. */
export function AccountSecurityContent() {
  const user = useCurrentUser();

  if (user.isPending) {
    return <AccountSecuritySkeleton />;
  }
  if (user.isError) {
    return (
      <AccountSecurityError
        error={user.error}
        retrying={user.isFetching}
        onRetry={() => void user.refetch()}
      />
    );
  }

  const profile = user.data;
  return (
    <div className="flex flex-col gap-4">
      <EmailCard email={profile.email} verified={profile.emailVerified} />
      <PasswordCard hasPassword={profile.hasPassword} />
      <ConnectedAccountsCard
        providers={profile.providers}
        hasPassword={profile.hasPassword}
      />
      <SessionsCard />
    </div>
  );
}
