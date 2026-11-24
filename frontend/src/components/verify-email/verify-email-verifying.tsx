import { LuLoaderCircle } from "react-icons/lu";

import { VerifyEmailCard } from "@/components/verify-email/verify-email-card";

/** Shown while the token is being checked, and while the server renders the page. */
export function VerifyEmailVerifying() {
  return (
    <VerifyEmailCard
      icon={
        <div className="flex size-14 items-center justify-center rounded-full bg-accent text-primary">
          <LuLoaderCircle
            className="size-7 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>
      }
      title="Verifying your email…"
      description="This only takes a second."
    />
  );
}
