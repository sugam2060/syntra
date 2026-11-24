"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";

import { useUpdateRole } from "@/api/workspaces";
import { PermissionChecklist } from "@/components/members/permission-checklist";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/error-message";
import { ROLE_NAME_MAX_LENGTH, type RoleInput, roleSchema } from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";
import type { PermissionGroup } from "@/types/members";
import type { WorkspaceRole } from "@/types/shared";

type RoleEditFormProps = {
  workspaceId: string;
  role: WorkspaceRole;
  groups: readonly PermissionGroup[];
  canGrant: (permissionKey: string) => boolean;
  /** Called when the delete button is pressed. */
  onDelete: () => void;
};

/** Rename a custom role and change what it grants. The role key never changes. */
export function RoleEditForm({ workspaceId, role, groups, canGrant, onDelete }: RoleEditFormProps) {
  const update = useUpdateRole(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: role.name, permissions: role.permissions } satisfies RoleInput as RoleInput,
    validators: { onSubmit: roleSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        await update.mutateAsync({
          roleId: role.id,
          input: { name: value.name.trim(), permissions: value.permissions },
        });
        toast.success(`${value.name.trim()} updated`);
      } catch (failure: unknown) {
        const message = getErrorMessage(failure, "Couldn't save the role. Try again.");
        setError(message);
        toast.error(message);
      }
    },
  });

  const selected = useStore(form.store, (state) => new Set(state.values.permissions));
  const isBusy = update.isPending;

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
      {error && <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>{error}</AuthBanner>}
      <FieldGroup className="gap-4">
        <form.Field name="name">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid} className="gap-2">
                <AuthFieldLabel htmlFor="role-name">Role name</AuthFieldLabel>
                <Input
                  id="role-name"
                  value={field.state.value}
                  maxLength={ROLE_NAME_MAX_LENGTH}
                  disabled={isBusy}
                  aria-invalid={invalid}
                  autoComplete="off"
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className="h-9 max-w-sm"
                />
                {invalid && (
                  <AuthFieldError>
                    {field.state.meta.errors[0]?.message ?? "Enter a role name."}
                  </AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="permissions">
          {(field) => (
            <Field className="gap-2">
              <AuthFieldLabel>Permissions</AuthFieldLabel>
              <PermissionChecklist
                groups={groups}
                selected={selected}
                canGrant={canGrant}
                disabled={isBusy}
                onToggle={(key, checked) =>
                  field.handleChange(
                    checked
                      ? [...field.state.value, key]
                      : field.state.value.filter((existing) => existing !== key),
                  )
                }
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={isBusy}
          onClick={onDelete}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Delete role
        </Button>
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Saving" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
