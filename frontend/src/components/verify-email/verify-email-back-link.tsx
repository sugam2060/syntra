import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The ghost "Back to sign in" action that closes the recovery states. */
export function VerifyEmailBackLink() {
  return (
    <Link
      href="/login"
      className={cn(
        buttonVariants({ variant: "ghost", size: "lg" }),
        "h-10 w-full px-4 text-muted-foreground sm:h-9",
      )}
    >
      Back to sign in
    </Link>
  );
}
