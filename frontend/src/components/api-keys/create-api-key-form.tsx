"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";

import { CreateKeyErrorBanner } from "@/components/api-keys/create-key-error-banner";
import { ExpirationField } from "@/components/api-keys/expiration-field";
import { PermissionChecklist } from "@/components/api-keys/permission-checklist";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthInput } from "@/components/shared/auth-input";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { useGrantablePermissions } from "@/hooks/use-grantable-permissions";
import { useWorkspacePermissions } from "@/api/workspaces";
import { resolveExpiresAt } from "@/lib/api-key-expiry";
import { describeCreateKeyError } from "@/lib/api-key-errors";
import { DEFAULT_KEY_PERMISSION, groupGrantablePermissions } from "@/lib/api-key-permissions";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  API_KEY_EXPIRATION,
  API_KEY_NAME_MAX_LENGTH,
  createApiKeySchema,
} from "@/types/schema";
import type { CreateApiKeyInput, CreateApiKeyRequest } from "@/types/schema";
import { cn } from "@/lib/utils";

const DEFAULT_VALUES = {
  name: "",
  permissions: [DEFAULT_KEY_PERMISSION],
  expiration: API_KEY_EXPIRATION.days90,
  customDate: "",
} satisfies CreateApiKeyInput;

type CreateApiKeyFormProps = {
  isPending: boolean;
  /** The last failure of the create request, or null. */
  error: unknown;
  onSubmit: (request: CreateApiKeyRequest) => void;
};

/** Name, permissions and expiration of a new key. Rendered inside the dialog, so it starts fresh on every open. */
export function CreateApiKeyForm({ isPending, error, onSubmit }: CreateApiKeyFormProps) {
  const { workspace } = useWorkspace();
  const catalogue = useWorkspacePermissions(workspace.id);
  const grantable = useGrantablePermissions();
  const [now] = useState(() => new Date());

  const form = useForm({
    defaultValues: DEFAULT_VALUES as CreateApiKeyInput,
    validators: { onSubmit: createApiKeySchema },
    onSubmit: ({ value }) => {
      const expiresAt = resolveExpiresAt(value.expiration, value.customDate, new Date());
      onSubmit({
        name: value.name.trim(),
        permissions: value.permissions,
        ...(expiresAt ? { expiresAt: expiresAt.toISOString() } : {}),
      });
    },
  });

  const values = useStore(form.store, (state) => state.values);
  const groups = useMemo(
    () => groupGrantablePermissions(catalogue.data ?? []),
    [catalogue.data],
  );

  const createError = error ? describeCreateKeyError(error) : null;
  const listLoading = catalogue.isPending || grantable.isPending;
  const listError =
    catalogue.isError || grantable.isError
      ? {
          message: "Couldn't load the permissions.",
          onRetry: () => {
            void catalogue.refetch();
            grantable.refetch();
          },
        }
      : null;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {createError && <CreateKeyErrorBanner error={createError} />}

      <FieldGroup className="gap-5">
        <form.Field name="name">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            const length = field.state.value.length;
            return (
              <Field data-invalid={invalid} className="gap-2">
                <div className="flex items-center justify-between gap-2">
                  <AuthFieldLabel htmlFor="api-key-name">Name</AuthFieldLabel>
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      length > API_KEY_NAME_MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {length}/{API_KEY_NAME_MAX_LENGTH}
                  </span>
                </div>
                <AuthInput
                  id="api-key-name"
                  name={field.name}
                  autoComplete="off"
                  placeholder="CI bot"
                  value={field.state.value}
                  disabled={isPending}
                  aria-invalid={invalid || undefined}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {invalid && (
                  <AuthFieldError>
                    {field.state.meta.errors[0]?.message ?? "Enter a name for this key."}
                  </AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="permissions">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid} className="gap-2">
                <AuthFieldLabel>Permissions</AuthFieldLabel>
                <PermissionChecklist
                  groups={groups}
                  selected={field.state.value}
                  canGrant={grantable.canGrant}
                  disabled={isPending}
                  isLoading={listLoading}
                  loadError={listError}
                  onChange={(next) => {
                    field.handleChange(next);
                    field.handleBlur();
                  }}
                />
                {invalid && (
                  <AuthFieldError>
                    {field.state.meta.errors[0]?.message ?? "Choose at least one permission."}
                  </AuthFieldError>
                )}
                {createError?.kind === "forbidden" && (
                  <AuthFieldError>You can&apos;t grant permissions you don&apos;t have.</AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="customDate">
          {(dateField) => (
            <ExpirationField
              expiration={values.expiration}
              customDate={dateField.state.value}
              now={now}
              disabled={isPending}
              customDateError={
                dateField.state.meta.isTouched && !dateField.state.meta.isValid
                  ? (dateField.state.meta.errors[0]?.message ?? "Pick a date after today.")
                  : null
              }
              onExpirationChange={(next) => {
                form.setFieldValue("expiration", next);
                // Re-sets the date so a stale "pick a later date" error stops blocking submit.
                dateField.handleChange(dateField.state.value);
              }}
              onCustomDateChange={(next) => {
                dateField.handleChange(next);
                dateField.handleBlur();
              }}
            />
          )}
        </form.Field>
      </FieldGroup>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={isPending} />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isPending || listLoading || listError !== null}>
          {isPending ? (
            <>
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              Creating
            </>
          ) : (
            "Create key"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
