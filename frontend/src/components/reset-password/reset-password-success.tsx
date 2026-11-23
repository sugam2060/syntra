import Link from "next/link";
import { LuCheck } from "react-icons/lu";

import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUTH_STATUS_TONE } from "@/types/shared";

export function ResetPasswordSuccess() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <AuthStatusIcon icon={LuCheck} tone={AUTH_STATUS_TONE.success} />

      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          Password updated
        </h1>
        <p className="text-sm leading-[21px] text-pretty text-muted-foreground">
          Your password has been changed and your other devices were signed out.
          Sign in with your new password.
        </p>
      </div>

      <Link
        href="/login"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-10 w-full px-4 hover:bg-primary-hover sm:h-9",
        )}
      >
        Go to sign in
      </Link>
    </div>
  );
}
