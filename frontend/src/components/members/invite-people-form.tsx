"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";
import { LuInfo, LuLoaderCircle } from "react-icons/lu";

import { useInviteMembers } from "@/api/workspaces";
import { InviteRoleOptions } from "@/components/members/invite-role-options";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { EmailChipInput } from "@/components/shared/email-chip-input";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-error";
import { canAssignRole } from "@/lib/role-permissions";
import {
  INVITE_MESSAGE_MAX_LENGTH,
  type InvitePeopleInput,
  invitePeopleSchema,
} from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";
import type { InviteResult, WorkspaceRole } from "@/types/shared";

function describeInviteError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status === 429 ? "Too many attempts. Try again in a minute." : error.message;
  }
  return "Something went wrong. Try again.";
}

type InvitePeopleFormProps = {
  workspaceId: string;
  /** Roles that can be offered: everything but the owner role. */
  roles: readonly WorkspaceRole[];
  canGrant: (permissionKey: string) => boolean;
  onSent: (results: InviteResult[]) => void;
};

/** Invite form: email chips, a role, and an optional personal message. */
export function InvitePeopleForm({ workspaceId, roles, canGrant, onSent }: InvitePeopleFormProps) {
  const invite = useInviteMembers(workspaceId);
  const [error, setError] = useState<string | null>(null);

  const defaultRole =
    roles.find((role) => role.isSystem && role.key === "member" && canAssignRole(role, canGrant)) ??
    roles.find((role) => canAssignRole(role, canGrant));

  const form = useForm({
    defaultValues: {
      emails: [],
      roleId: defaultRole?.id ?? "",
      message: "",
    } satisfies InvitePeopleInput as InvitePeopleInput,
    validators: { onSubmit: invitePeopleSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      const message = value.message.trim();
      try {
        const results = await invite.mutateAsync({
          emails: value.emails,
          roleId: value.roleId,
          ...(message ? { message } : {}),
        });
        onSent(results);
      } catch (failure: unknown) {
        setError(describeInviteError(failure));
      }
    },
  });

  const message = useStore(form.store, (state) => state.values.message);
  const isBusy = invite.isPending;

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
        <form.Field name="emails">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid} className="gap-2">
                <AuthFieldLabel htmlFor="invite-emails">Email addresses</AuthFieldLabel>
                <EmailChipInput
                  id="invite-emails"
                  emails={field.state.value}
                  onChange={(next) => {
                    field.handleChange(next);
                    field.handleBlur();
                  }}
                  disabled={isBusy}
                  invalid={invalid}
                />
                {invalid && (
                  <AuthFieldError>
                    {field.state.meta.errors[0]?.message ?? "Add at least one email address."}
                  </AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="roleId">
          {(field) => (
            <Field className="gap-2">
              <AuthFieldLabel>Role</AuthFieldLabel>
              <InviteRoleOptions
                roles={roles}
                value={field.state.value}
                onChange={field.handleChange}
                canGrant={canGrant}
                disabled={isBusy}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="message">
          {(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid} className="gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <AuthFieldLabel htmlFor="invite-message">
                    Personal message <span className="font-normal text-muted-foreground">(optional)</span>
                  </AuthFieldLabel>
                  <span className="text-xs leading-4 text-muted-foreground" aria-live="polite">
                    {message.length}/{INVITE_MESSAGE_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  id="invite-message"
                  rows={3}
                  maxLength={INVITE_MESSAGE_MAX_LENGTH}
                  placeholder="Add a note to the invitation email"
                  value={field.state.value}
                  disabled={isBusy}
                  aria-invalid={invalid}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  className="min-h-20 resize-none"
                />
                {invalid && (
                  <AuthFieldError>
                    {field.state.meta.errors[0]?.message ?? "That message is too long."}
                  </AuthFieldError>
                )}
              </Field>
            );
          }}
        </form.Field>
      </FieldGroup>

      <p className="flex items-start gap-2 rounded-card bg-surface p-3 text-xs leading-[18px] text-muted-foreground">
        <LuInfo className="mt-px size-4 shrink-0 text-info" aria-hidden="true" />
        Invitees must verify their email. Links expire in 7 days.
      </p>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={isBusy} />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isBusy || roles.length === 0}>
          {isBusy ? (
            <>
              <LuLoaderCircle className="animate-spin" aria-hidden="true" />
              Sending
            </>
          ) : (
            "Send invites"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
