import Image from "next/image";

import { TopBar } from "@/components/shared/top-bar";

/**
 * Frame of `/invitations/accept`: the logo-only top bar (the visitor may not be signed in) over the auth
 * backdrop, with one centered 440px card for whichever state applies.
 */
export function InvitationAcceptShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background sm:bg-surface sm:dark:bg-background">
      <Image
        src="/auth/auth-bg-light.jpg"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="pointer-events-none hidden object-cover select-none sm:block dark:sm:hidden"
      />
      <Image
        src="/auth/auth-bg-dark.jpg"
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="pointer-events-none hidden object-cover select-none dark:sm:block"
      />

      <TopBar className="bg-background/90" />

      <main className="relative z-10 flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-[440px] flex-col gap-6 sm:rounded-card sm:border sm:bg-card sm:p-8 sm:shadow-xl dark:sm:shadow-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
