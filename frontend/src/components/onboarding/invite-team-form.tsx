"use client";

import { useForm, useStore } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useCurrentUser } from "@/api/auth";
import {
  useInviteMembers,
  useWorkspaceBySlug,
  useWorkspaceRoles,
} from "@/api/workspaces";
import { BoardPreviewCard } from "@/components/onboarding/board-preview-card";
import { InviteRolePicker } from "@/components/onboarding/invite-role-picker";
import { InviteTeamSkeleton } from "@/components/onboarding/invite-team-skeleton";
import { EmailChipInput } from "@/components/shared/email-chip-input";
import { WorkspaceNotFound } from "@/components/shared/workspace-not-found";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { ApiError } from "@/lib/api-error";
import { DEFAULT_INVITE_ROLE } from "@/lib/invite-roles";
import { describeSkippedInvites, summarizeInvites } from "@/lib/invite-summary";
import { workspaceHomePath } from "@/lib/onboarding-paths";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/user-display";
import type { InviteTeamStatus, PreviewMember } from "@/types/onboarding";
import { type InviteMembersInput, inviteMembersSchema } from "@/types/schema";
import { AUTH_BANNER_VARIANT } from "@/types/shared";

const IDLE: InviteTeamStatus = { kind: "idle" };
const DEFAULT_VALUES: InviteMembersInput = {
  emails: [],
  role: DEFAULT_INVITE_ROLE,
};

function statusFromError(error: unknown): InviteTeamStatus {
  if (!(error instanceof ApiError)) {
    return { kind: "error", message: "Something went wrong. Try again." };
  }
  if (error.status === 429) {
    return { kind: "rate-limited" };
  }
  if (error.status === 403) {
    return {
      kind: "error",
      message: "You don't have permission to invite people to this workspace.",
    };
  }
  return { kind: "error", message: error.message };
}

type InviteTeamFormProps = {
  /** Slug of the workspace that was just created, from the URL. */
  workspaceSlug: string;
};

/** Step 3: invite teammates by email with one role, or skip. */
export function InviteTeamForm({ workspaceSlug }: InviteTeamFormProps) {
  const router = useRouter();
  const user = useCurrentUser();
  const workspace = useWorkspaceBySlug(workspaceSlug);
  const roles = useWorkspaceRoles(workspace.data?.id ?? null);
  const invite = useInviteMembers(workspace.data?.id ?? "");
  const [status, setStatus] = useState<InviteTeamStatus>(IDLE);
  const isBusy = invite.isPending;

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    validators: { onSubmit: inviteMembersSchema },
    onSubmit: async ({ value }) => {
      setStatus(IDLE);
      const role = roles.data?.find(
        (candidate) => candidate.isSystem && candidate.key === value.role,
      );
      if (!role) {
        setStatus({
          kind: "error",
          message: "Couldn't find that role. Reload the page and try again.",
        });
        return;
      }

      try {
        const results = await invite.mutateAsync({
          emails: value.emails,
          roleId: role.id,
        });
        const summary = summarizeInvites(results);
        const skipped = describeSkippedInvites(summary);

        if (summary.invited === 0) {
          toast.info(
            skipped ?? "Nobody new to invite.",
          );
          return;
        }
        toast.success(
          summary.invited === 1 ? "1 invite sent" : `${summary.invited} invites sent`,
          skipped ? { description: skipped } : undefined,
        );
        router.push(workspaceHomePath(workspaceSlug));
      } catch (error: unknown) {
        setStatus(statusFromError(error));
      }
    },
  });

  const emails = useStore(form.store, (state) => state.values.emails);

  if (workspace.isPending) {
    return <InviteTeamSkeleton />;
  }
  if (workspace.isError || !workspace.data) {
    return <WorkspaceNotFound />;
  }

  const previewMembers: PreviewMember[] = [
    ...(user.data ? [{ initials: getInitials(user.data), avatarUrl: user.data.avatarUrl }] : []),
    ...emails.map((email) => ({ initials: getInitials({ name: null, email }), avatarUrl: null })),
  ];
  const rolesUnavailable = roles.isPending || roles.isError;

  return (
    <div className="grid w-full max-w-[960px] grid-cols-1 items-start gap-12 lg:grid-cols-12">
      <div className="flex flex-col gap-8 lg:col-span-7">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
            Invite your team
          </h1>
          <p className="text-sm leading-[21px] text-muted-foreground">
            Collaborate in {workspace.data.name}. You can always invite more people later.
          </p>
        </div>

        {status.kind === "rate-limited" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.warning}>
            Too many attempts. Try again in a minute.
          </AuthBanner>
        )}
        {status.kind === "error" && (
          <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
            {status.message}
          </AuthBanner>
        )}
        {roles.isError && (
          <AuthBanner
            variant={AUTH_BANNER_VARIANT.danger}
            action={
              <button
                type="button"
                onClick={() => void roles.refetch()}
                className="w-fit text-xs leading-4 font-medium text-destructive hover:underline"
              >
                Try again
              </button>
            }
          >
            Couldn&apos;t load the roles for this workspace.
          </AuthBanner>
        )}

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <FieldGroup className="gap-6">
            <form.Field name="emails">
              {(field) => {
                const invalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={invalid} className="gap-2">
                    <AuthFieldLabel htmlFor={field.name}>
                      Email addresses
                    </AuthFieldLabel>
                    <EmailChipInput
                      id={field.name}
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
                        {field.state.meta.errors[0]?.message ??
                          "Add at least one email address."}
                      </AuthFieldError>
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="role">
              {(field) => (
                <Field className="gap-2">
                  <AuthFieldLabel>Role</AuthFieldLabel>
                  <InviteRolePicker
                    value={field.state.value}
                    onChange={field.handleChange}
                    disabled={isBusy}
                  />
                </Field>
              )}
            </form.Field>

            <div className="flex items-center justify-between pt-2">
              <Link
                href={workspaceHomePath(workspaceSlug)}
                aria-disabled={isBusy}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-10 px-4 text-muted-foreground hover:text-foreground sm:h-9",
                  isBusy && "pointer-events-none opacity-50",
                )}
              >
                Skip for now
              </Link>
              <Button
                type="submit"
                size="lg"
                disabled={isBusy || rolesUnavailable}
                className="h-10 gap-2 px-6 hover:bg-primary-hover disabled:opacity-60 sm:h-9"
              >
                {isBusy ? (
                  <>
                    <LuLoaderCircle
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    Sending
                  </>
                ) : (
                  "Send invites"
                )}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </div>

      <div className="hidden lg:col-span-5 lg:block">
        <BoardPreviewCard
          workspaceName={workspace.data.name}
          members={previewMembers}
        />
      </div>
    </div>
  );
}
