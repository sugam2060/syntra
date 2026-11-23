import Image from "next/image";

/** Full-screen background plus the centered card used by every auth page. Children stack with a 24px gap. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6 sm:bg-surface sm:dark:bg-background lg:p-12">
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

      <div className="relative z-10 flex w-full max-w-[400px] flex-col gap-6 sm:max-w-[420px] sm:rounded-card sm:border sm:bg-card sm:p-8 sm:shadow-xl dark:sm:shadow-2xl">
        {children}
      </div>
    </main>
  );
}
