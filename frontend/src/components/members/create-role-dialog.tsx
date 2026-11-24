"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useCreateRole } from "@/api/workspaces";
import { PermissionChecklist } from "@/components/members/permission-checklist";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/error-message";
import { ROLE_NAME_MAX_LENGTH, type RoleInput, roleSchema } from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";
import type { PermissionGroup } from "@/types/members";

type CreateRoleFormProps = {
  workspaceId: string;
  groups: readonly PermissionGroup[];
  canGrant: (permissionKey: string) => boolean;
  onCreated: (roleId: string) => void;
};

function CreateRoleForm({ workspaceId, groups, canGrant, onCreated }: CreateRoleFormProps) {
  const create = useCreateRole(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: "", permissions: [] } satisfies RoleInput as RoleInput,
    validators: { onSubmit: roleSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const role = await create.mutateAsync({
          name: value.name.trim(),
          permissions: value.permissions,
        });
        toast.success(`${role.name} created`);
        onCreated(role.id);
      } catch (failure: unknown) {
        const message = getErrorMessage(failure, "Couldn't create the role. Try again.");
        setError(message);
        toast.error(message);
      }
    },
  });

  const selected = useStore(form.store, (state) => new Set(state.values.permissions));
  const isBusy = create.isPending;

  return (
    <form
      noValidate
      className="flex min-h-0 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {error && <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>{error}</AuthBanner>}
      <FieldGroup className="min-h-0 gap-4">
        <form.Field name="name">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid} className="gap-2">
                <AuthFieldLabel htmlFor="new-role-name">Role name</AuthFieldLabel>
                <Input
                  id="new-role-name"
                  value={field.state.value}
                  maxLength={ROLE_NAME_MAX_LENGTH}
                  placeholder="Release manager"
                  disabled={isBusy}
                  aria-invalid={invalid}
                  autoComplete="off"
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className="h-9"
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
            <Field className="min-h-0 gap-2">
              <AuthFieldLabel>Permissions</AuthFieldLabel>
              <div className="max-h-72 overflow-y-auto rounded-card">
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
              </div>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={isBusy} />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isBusy}>
          {isBusy ? (
            <>
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              Creating
            </>
          ) : (
            "Create role"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

type CreateRoleDialogProps = {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: readonly PermissionGroup[];
  canGrant: (permissionKey: string) => boolean;
  onCreated: (roleId: string) => void;
};

/** Dialog to create a custom role. Only permissions the caller holds can be ticked. */
export function CreateRoleDialog({
  workspaceId,
  open,
  onOpenChange,
  groups,
  canGrant,
  onCreated,
}: CreateRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] leading-[22px] font-semibold">Create role</DialogTitle>
          <DialogDescription>
            Name the role and choose what people with it can do.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <CreateRoleForm
            workspaceId={workspaceId}
            groups={groups}
            canGrant={canGrant}
            onCreated={(roleId) => {
              onOpenChange(false);
              onCreated(roleId);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
