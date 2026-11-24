"use client";

import { LuPlus } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CreateKeyButtonProps = {
  /** True when the workspace already has the maximum of active keys. */
  atLimit: boolean;
  maxKeys: number;
  onClick: () => void;
};

/**
 * "Create API key". At the limit it stays focusable (aria-disabled) so its tooltip can explain why
 * it does nothing.
 */
export function CreateKeyButton({ atLimit, maxKeys, onClick }: CreateKeyButtonProps) {
  const button = (
    <Button
      type="button"
      size="lg"
      aria-disabled={atLimit || undefined}
      onClick={atLimit ? undefined : onClick}
      className={atLimit ? "cursor-not-allowed opacity-50 hover:bg-primary" : undefined}
    >
      <LuPlus aria-hidden="true" />
      Create API key
    </Button>
  );

  if (!atLimit) {
    return button;
  }
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>
        {`This workspace has ${maxKeys} active keys. Revoke one to create another.`}
      </TooltipContent>
    </Tooltip>
  );
}
