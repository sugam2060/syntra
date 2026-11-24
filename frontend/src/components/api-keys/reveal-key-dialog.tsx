"use client";

import { useState } from "react";
import { LuCheck, LuTriangleAlert } from "react-icons/lu";

import { CopyKeyButton } from "@/components/api-keys/copy-key-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildCurlExample } from "@/lib/api-key-display";
import { env } from "@/lib/env";
import type { CreatedApiKey } from "@/types/shared";

type RevealKeyDialogProps = {
  createdKey: CreatedApiKey;
  workspaceId: string;
  /** Called once the person confirmed they stored the key. The parent must drop the key then. */
  onDone: () => void;
};

/**
 * The one time the full key is shown. It cannot be dismissed (overlay, Escape) until the person ticks
 * that they stored it. The key lives only in props of this dialog: the parent unmounts it on done.
 */
export function RevealKeyDialog({ createdKey, workspaceId, onDone }: RevealKeyDialogProps) {
  const [stored, setStored] = useState(false);

  return (
    <Dialog
      open
      disablePointerDismissal
      onOpenChange={(next, details) => {
        if (next) {
          return;
        }
        if (!stored) {
          details.cancel();
          return;
        }
        onDone();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[520px]"
      >
        <DialogHeader className="items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-full bg-success/10 text-success"
          >
            <LuCheck className="size-5" />
          </span>
          <div className="flex flex-col gap-1.5">
            <DialogTitle className="text-lg leading-6">Copy your key now</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{createdKey.name}</span> is ready to use.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex items-stretch gap-2">
          <code
            data-testid="created-api-key"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[13px] leading-5 break-all text-foreground select-all"
          >
            {createdKey.key}
          </code>
          <CopyKeyButton value={createdKey.key} />
        </div>

        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-[18px] text-foreground"
        >
          <LuTriangleAlert className="mt-px size-4 shrink-0 text-warning" aria-hidden="true" />
          <p>
            You won&apos;t be able to see this key again. If you lose it, revoke it and create a
            new one.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-foreground">Use it as a Bearer token</p>
          <pre
            tabIndex={0}
            className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs leading-5 text-foreground"
          >
            <code>{buildCurlExample(env.NEXT_PUBLIC_API_URL, workspaceId)}</code>
          </pre>
        </div>

        <label htmlFor="api-key-stored" className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox id="api-key-stored" checked={stored} onCheckedChange={setStored} />
          I&apos;ve stored this key safely
        </label>

        <DialogFooter>
          <Button type="button" disabled={!stored} onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
