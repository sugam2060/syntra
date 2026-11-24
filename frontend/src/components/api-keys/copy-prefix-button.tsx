"use client";

import { LuCheck, LuCopy } from "react-icons/lu";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

type CopyPrefixButtonProps = {
  keyPrefix: string;
  keyName: string;
};

/** Copies only the key prefix: the full key is not available after creation. */
export function CopyPrefixButton({ keyPrefix, keyName }: CopyPrefixButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  async function handleCopy(): Promise<void> {
    if (!(await copy(keyPrefix))) {
      toast.error("Couldn't copy. Select the text and copy it instead.");
    }
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Copy key prefix of ${keyName}`}
              onClick={() => void handleCopy()}
            />
          }
        >
          {copied ? (
            <LuCheck className="text-success" aria-hidden="true" />
          ) : (
            <LuCopy aria-hidden="true" />
          )}
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied" : "Copy prefix"}</TooltipContent>
      </Tooltip>
      <span role="status" className="sr-only">
        {copied ? "Prefix copied" : ""}
      </span>
    </>
  );
}
