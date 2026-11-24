"use client";

import { LuCheck, LuCopy } from "react-icons/lu";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

/** Copies the full key. Says "Copied" for a moment so the person knows it worked. */
export function CopyKeyButton({ value }: { value: string }) {
  const { copied, copy } = useCopyToClipboard();

  async function handleCopy(): Promise<void> {
    if (!(await copy(value))) {
      toast.error("Couldn't copy. Select the key and copy it instead.");
    }
  }

  return (
    <Button type="button" size="lg" className="shrink-0" onClick={() => void handleCopy()}>
      {copied ? <LuCheck aria-hidden="true" /> : <LuCopy aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}
