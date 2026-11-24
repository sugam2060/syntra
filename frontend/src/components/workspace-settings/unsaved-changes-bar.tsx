import { LuLoaderCircle } from "react-icons/lu";

import { Button } from "@/components/ui/button";

type UnsavedChangesBarProps = {
  /** Id of the profile form, so Save submits it from outside the form. */
  formId: string;
  canSave: boolean;
  isSaving: boolean;
  onDiscard: () => void;
};

/**
 * Pinned to the bottom of the scrolling area while the profile form has changes. It is a flex item
 * of the settings column (`order-last`), so it lines up with the cards and stays in view.
 */
export function UnsavedChangesBar({
  formId,
  canSave,
  isSaving,
  onDiscard,
}: UnsavedChangesBarProps) {
  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      className="sticky bottom-4 z-20 order-last flex items-center justify-between gap-3 rounded-[10px] border border-border bg-popover px-4 py-3 shadow-md"
    >
      <p className="min-w-0 text-sm leading-5 font-medium text-foreground">
        You have unsaved changes
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={isSaving}
          onClick={onDiscard}
        >
          Discard
        </Button>
        <Button
          type="submit"
          form={formId}
          size="lg"
          disabled={!canSave}
          className="gap-2 hover:bg-primary-hover disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <LuLoaderCircle
                className="animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Saving
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}
