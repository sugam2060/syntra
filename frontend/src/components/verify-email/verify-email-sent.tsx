import { LuMail } from "react-icons/lu";

import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { VerifyEmailBackLink } from "@/components/verify-email/verify-email-back-link";
import { VerifyEmailCard } from "@/components/verify-email/verify-email-card";
import { AUTH_STATUS_TONE } from "@/types/shared";

/** Confirmation after asking for a new link. The gateway answers the same for every address, so the copy says "if". */
export function VerifyEmailSent() {
  return (
    <VerifyEmailCard
      icon={<AuthStatusIcon icon={LuMail} tone={AUTH_STATUS_TONE.primary} />}
      title="Check your inbox"
      description="If an unverified account exists for that address, we sent a new link."
    >
      <p className="text-xs leading-[18px] text-muted-foreground">
        The previous link no longer works.
      </p>
      <VerifyEmailBackLink />
    </VerifyEmailCard>
  );
}
