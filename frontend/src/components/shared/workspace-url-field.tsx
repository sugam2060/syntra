import { AuthInput } from "@/components/shared/auth-input";
import { SLUG_MAX_LENGTH } from "@/types/schema";
import { WORKSPACE_URL_PREFIX } from "@/lib/onboarding-paths";
import { cn } from "@/lib/utils";

type WorkspaceUrlFieldProps = {
  id: string;
  name: string;
  value: string;
  disabled: boolean;
  /** Shows the value but does not let it change (it stays focusable and selectable). */
  readOnly?: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

/** The slug input joined to its fixed `syntra.app/w/` prefix, sharing one border and one focus ring. */
export function WorkspaceUrlField({
  id,
  name,
  value,
  disabled,
  readOnly = false,
  invalid,
  onChange,
  onBlur,
}: WorkspaceUrlFieldProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center overflow-hidden rounded-lg border border-input bg-background transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:h-9 dark:bg-surface",
        readOnly && "bg-surface dark:bg-card",
        invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-full shrink-0 items-center border-r border-border bg-surface px-3 font-mono text-[13px] text-muted-foreground dark:bg-card"
      >
        {WORKSPACE_URL_PREFIX}
      </span>
      <AuthInput
        id={id}
        name={name}
        type="text"
        inputMode="text"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={SLUG_MAX_LENGTH}
        placeholder="acme-product"
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid}
        aria-label="Workspace URL"
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent font-mono text-[13px] shadow-none focus-visible:ring-0 sm:h-full dark:bg-transparent"
      />
    </div>
  );
}
