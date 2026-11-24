import { LuKeyRound } from "react-icons/lu";

type ApiKeysEmptyProps = {
  /** The "Create API key" button, or nothing when the caller cannot create keys. */
  action: React.ReactNode;
};

export function ApiKeysEmpty({ action }: ApiKeysEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-accent text-primary"
      >
        <LuKeyRound className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] leading-[22px] font-semibold text-foreground">
          No API keys yet
        </h2>
        <p className="max-w-[44ch] text-sm leading-[21px] text-muted-foreground">
          Create a key to call the AI agents from your own tools.
        </p>
      </div>
      {action}
    </div>
  );
}
