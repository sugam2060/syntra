"use client";

import { FcGoogle } from "react-icons/fc";

import { getGoogleSignInUrl } from "@/api/auth";
import { Button } from "@/components/ui/button";

type GoogleButtonProps = {
  /** "Continue with Google" on sign in, "Sign up with Google" on create account. */
  children: React.ReactNode;
  disabled?: boolean;
};

export function GoogleButton({ children, disabled }: GoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={disabled}
      onClick={() => window.location.assign(getGoogleSignInUrl())}
      className="h-10 w-full gap-2 bg-card px-4 hover:bg-surface sm:h-9 dark:bg-card dark:hover:bg-surface"
    >
      <FcGoogle className="size-4" aria-hidden="true" />
      {children}
    </Button>
  );
}
