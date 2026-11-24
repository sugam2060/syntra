import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ONBOARDING_PATH } from "@/lib/onboarding-paths";
import { cn } from "@/lib/utils";

type WorkspaceNotFoundProps = {
  /** When set, a second link offers a way back to the user's own workspaces. */
  backHref?: string;
};

/** Shown when the workspace in the URL does not exist or the user is not a member of it. */
export function WorkspaceNotFound({ backHref }: WorkspaceNotFoundProps) {
  return (
    <div role="alert" className="flex w-full max-w-[460px] flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          We couldn&apos;t find that workspace
        </h1>
        <p className="text-sm leading-[21px] text-muted-foreground">
          It may not exist, or you may not be a member of it. Create a workspace to continue.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href={ONBOARDING_PATH.workspace}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 w-fit px-6 hover:bg-primary-hover sm:h-9",
          )}
        >
          Create a workspace
        </Link>
        {backHref && (
          <Link
            href={backHref}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-10 w-fit px-6 sm:h-9")}
          >
            Go to my workspaces
          </Link>
        )}
      </div>
    </div>
  );
}
