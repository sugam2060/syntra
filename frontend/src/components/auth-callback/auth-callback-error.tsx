import Link from "next/link";
import { LuCircleAlert } from "react-icons/lu";

import { AuthStatusIcon } from "@/components/shared/auth-status-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthCallbackMessage } from "@/types/auth-callback";
import { AUTH_STATUS_TONE } from "@/types/shared";

type AuthCallbackErrorProps = {
  message: AuthCallbackMessage;
};

/** Every failed callback ends here: a fixed message and one way forward. The URL value is never rendered. */
export function AuthCallbackError({ message }: AuthCallbackErrorProps) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <AuthStatusIcon icon={LuCircleAlert} tone={AUTH_STATUS_TONE.danger} />

      <div role="alert" className="flex flex-col gap-2">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          {message.title}
        </h1>
        <p className="text-sm leading-[21px] text-pretty text-muted-foreground">
          {message.description}
        </p>
      </div>

      <Link
        href="/login"
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-10 w-full px-4 hover:bg-primary-hover sm:h-9",
        )}
      >
        Back to sign in
      </Link>
    </div>
  );
}
