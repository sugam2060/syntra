"use client";

import { LuTriangleAlert } from "react-icons/lu";

import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthInput } from "@/components/shared/auth-input";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatKeyDate, resolveExpiresAt } from "@/lib/api-key-expiry";
import { startOfTomorrow, toDateInputValue } from "@/lib/local-date";
import { API_KEY_EXPIRATION } from "@/types/schema";
import type { ApiKeyExpiration } from "@/types/schema";

const EXPIRATION_LABELS: Record<ApiKeyExpiration, string> = {
  [API_KEY_EXPIRATION.days30]: "30 days",
  [API_KEY_EXPIRATION.days90]: "90 days",
  [API_KEY_EXPIRATION.year1]: "1 year",
  [API_KEY_EXPIRATION.custom]: "Custom date",
  [API_KEY_EXPIRATION.never]: "No expiration",
};

const EXPIRATION_ORDER: readonly ApiKeyExpiration[] = [
  API_KEY_EXPIRATION.days30,
  API_KEY_EXPIRATION.days90,
  API_KEY_EXPIRATION.year1,
  API_KEY_EXPIRATION.custom,
  API_KEY_EXPIRATION.never,
];

function isExpiration(value: unknown): value is ApiKeyExpiration {
  return EXPIRATION_ORDER.some((option) => option === value);
}

type ExpirationFieldProps = {
  expiration: ApiKeyExpiration;
  customDate: string;
  /** What "today" is for the helper text and the earliest custom date. */
  now: Date;
  disabled: boolean;
  customDateError: string | null;
  onExpirationChange: (value: ApiKeyExpiration) => void;
  onCustomDateChange: (value: string) => void;
};

/** When the key stops working: a preset, a custom date, or never (with a warning). */
export function ExpirationField({
  expiration,
  customDate,
  now,
  disabled,
  customDateError,
  onExpirationChange,
  onCustomDateChange,
}: ExpirationFieldProps) {
  const expiresAt = resolveExpiresAt(expiration, customDate, now);

  return (
    <Field className="gap-2">
      <AuthFieldLabel htmlFor="api-key-expiration">Expiration</AuthFieldLabel>
      <Select
        value={expiration}
        items={EXPIRATION_LABELS}
        disabled={disabled}
        onValueChange={(value) => {
          if (isExpiration(value)) {
            onExpirationChange(value);
          }
        }}
      >
        <SelectTrigger id="api-key-expiration" className="h-10 w-full bg-background sm:h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {EXPIRATION_ORDER.map((option) => (
            <SelectItem key={option} value={option}>
              {EXPIRATION_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {expiration === API_KEY_EXPIRATION.custom && (
        <>
          <AuthInput
            type="date"
            aria-label="Expiration date"
            value={customDate}
            min={toDateInputValue(startOfTomorrow(now))}
            disabled={disabled}
            aria-invalid={customDateError ? true : undefined}
            onChange={(event) => onCustomDateChange(event.target.value)}
          />
          {customDateError && <AuthFieldError>{customDateError}</AuthFieldError>}
        </>
      )}

      {expiration === API_KEY_EXPIRATION.never ? (
        <p className="flex items-start gap-1.5 text-xs leading-[18px] text-[color-mix(in_oklch,var(--warning),var(--foreground)_40%)]">
          <LuTriangleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          A key that never expires stays valid until you revoke it.
        </p>
      ) : (
        expiresAt && (
          <p className="text-xs leading-[18px] text-muted-foreground">
            Expires on {formatKeyDate(expiresAt)}.
          </p>
        )
      )}
    </Field>
  );
}
