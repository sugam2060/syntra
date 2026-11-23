import Link from "next/link";
import { LuClock } from "react-icons/lu";

import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AUTH_STATUS_TONE } from "@/types/shared";

/** Shown when the link has no token, the token is malformed, or the gateway refused it (expired or already used). */
export function ResetPasswordInvalid() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <AuthStatusIcon icon={LuClock} tone={AUTH_STATUS_TONE.warning} />

      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          This reset link is no longer valid
        </h1>
        <p className="text-sm leading-[21px] text-pretty text-muted-foreground">
          Links expire after 30 minutes and work once. Request a new one from the
          sign-in page.
        </p>
      </div>

      <Link
        href="/login?forgot=1"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-10 w-full px-4 hover:bg-primary-hover sm:h-9",
        )}
      >
        Request a new link
      </Link>
    </div>
  );
}
