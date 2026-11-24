import { LuCircleAlert } from "react-icons/lu";

import { Button } from "@/components/ui/button";

type ApiKeysErrorProps = {
  message: string;
  onRetry: () => void;
};

export function ApiKeysError({ message, onRetry }: ApiKeysErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <LuCircleAlert className="size-5 text-destructive" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] leading-[22px] font-semibold text-foreground">
          Couldn&apos;t load API keys
        </h2>
        <p className="max-w-[44ch] text-sm leading-[21px] text-muted-foreground">{message}</p>
      </div>
      <Button type="button" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
