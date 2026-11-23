import { LuLoaderCircle } from "react-icons/lu";

import { Button } from "@/components/ui/button";

type AuthSubmitButtonProps = {
  pending: boolean;
  /** Shown with a spinner while pending, for example "Signing in...". */
  pendingLabel: string;
  children: React.ReactNode;
};

export function AuthSubmitButton({
  pending,
  pendingLabel,
  children,
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="h-10 w-full gap-2 px-4 hover:bg-primary-hover disabled:bg-primary-hover disabled:opacity-100 sm:h-9"
    >
      {pending ? (
        <>
          <LuLoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
