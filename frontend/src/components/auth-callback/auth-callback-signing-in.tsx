import { LuLock } from "react-icons/lu";

type AuthCallbackSigningInProps = {
  title?: string;
  description?: string;
};

/** Transient state while the session is being restored. Also the Suspense fallback while the URL is read. */
export function AuthCallbackSigningIn({
  title = "Signing you in…",
  description = "Securing your session",
}: AuthCallbackSigningInProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 text-center"
    >
      <div className="relative flex size-14 items-center justify-center">
        <div
          aria-hidden="true"
          className="size-14 animate-spin rounded-full border-4 border-accent border-t-primary motion-reduce:animate-none"
        />
        <LuLock className="absolute size-5 text-primary" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-[21px] text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
