import Link from "next/link";
import { LuCheck } from "react-icons/lu";

import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { VerifyEmailCard } from "@/components/verify-email/verify-email-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUTH_STATUS_TONE } from "@/types/shared";

/** The account is active. Verifying does not start a session, so the next step is signing in. */
export function VerifyEmailSuccess() {
  return (
    <VerifyEmailCard
      icon={<AuthStatusIcon icon={LuCheck} tone={AUTH_STATUS_TONE.success} />}
      title="Email verified"
      description="Your account is active. Sign in to get started."
    >
      <Link
        href="/login"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-10 w-full px-4 hover:bg-primary-hover sm:h-9",
        )}
      >
        Continue to sign in
      </Link>
    </VerifyEmailCard>
  );
}
