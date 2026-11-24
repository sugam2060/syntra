"use client";

import { useForm, useStore } from "@tanstack/react-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuArrowLeft, LuLoaderCircle } from "react-icons/lu";

import { useCreateWorkspace } from "@/api/workspaces";
import { TeamSizeControl } from "@/components/onboarding/team-size-control";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthInput } from "@/components/shared/auth-input";
import { SlugAvailabilityStatus } from "@/components/shared/slug-availability-status";
import { WorkspaceUrlField } from "@/components/shared/workspace-url-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { useSlugStatus } from "@/hooks/use-slug-status";
import { ApiError } from "@/lib/api-error";
import { invitePath, ONBOARDING_PATH } from "@/lib/onboarding-paths";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";
import { type CreateWorkspaceStatus, type TeamSize } from "@/types/onboarding";
import {
  type CreateWorkspaceInput,
  createWorkspaceSchema,
  WORKSPACE_NAME_MAX_LENGTH,
} from "@/types/schema";
import { AUTH_BANNER_VARIANT, SLUG_STATUS, type SlugStatus } from "@/types/shared";

const IDLE: CreateWorkspaceStatus = { kind: "idle" };

function statusFromError(error: unknown): CreateWorkspaceStatus {
  if (!(error instanceof ApiError)) {
    return { kind: "error", message: "Something went wrong. Try again." };
  }
  if (error.status === 409) {
    return { kind: "slug-taken" };
  }
  if (error.status === 429) {
    return { kind: "rate-limited" };
  }
  return { kind: "error", message: error.message };
}

function isBlockingSlugStatus(status: SlugStatus): boolean {
  return (
    status === SLUG_STATUS.taken ||
    status === SLUG_STATUS.reserved ||
    status === SLUG_STATUS.invalid
  );
}

/** Step 2: name the workspace and pick its URL. The URL follows the name until it is edited by hand. */
export function CreateWorkspaceForm() {
  const router = useRouter();
  const createWorkspace = useCreateWorkspace();
  const [status, setStatus] = useState<CreateWorkspaceStatus>(IDLE);
  const [slugEdited, setSlugEdited] = useState(false);
  const [teamSize, setTeamSize] = useState<TeamSize | null>(null);
  const isBusy = createWorkspace.isPending;

  const form = useForm({
    defaultValues: { name: "", slug: "" } satisfies CreateWorkspaceInput,
    validators: { onSubmit: createWorkspaceSchema },
    onSubmit: async ({ value }) => {
      setStatus(IDLE);
      try {
        const workspace = await createWorkspace.mutateAsync(value);
        router.push(invitePath(workspace.slug));
      } catch (error: unknown) {
        setStatus(statusFromError(error));
      }
    },
  });

  const slug = useStore(form.store, (state) => state.values.slug);
  const checkedStatus = useSlugStatus(slug);
  const slugStatus: SlugStatus =
    status.kind === "slug-taken" ? SLUG_STATUS.taken : checkedStatus;

  function handleNameChange(value: string): void {
    if (!slugEdited) {
      form.setFieldValue("slug", slugify(value));
    }
    if (status.kind === "slug-taken") {
      setStatus(IDLE);
    }
  }

  function handleSlugChange(value: string): void {
    setSlugEdited(true);
    if (status.kind === "slug-taken") {
      setStatus(IDLE);
    }
    form.setFieldValue("slug", value.toLowerCase());
  }

  return (
    <div className="flex w-full max-w-[460px] flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          Name your workspace
        </h1>
        <p className="text-sm leading-[21px] text-muted-foreground">
          You can change your workspace name and URL anytime in settings.
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

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <FieldGroup className="gap-6">
          <form.Field name="name">
            {(field) => {
              const invalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={invalid} className="gap-1">
                  <AuthFieldLabel htmlFor={field.name}>
                    Workspace name
                  </AuthFieldLabel>
                  <AuthInput
                    id={field.name}
                    name={field.name}
                    type="text"
                    autoComplete="organization"
                    maxLength={WORKSPACE_NAME_MAX_LENGTH}
                    placeholder="Acme Product"
                    value={field.state.value}
                    disabled={isBusy}
                    aria-invalid={invalid}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      handleNameChange(event.target.value);
                    }}
                  />
                  {invalid && (
                    <AuthFieldError>
                      {field.state.meta.errors[0]?.message ??
                        "Enter a workspace name."}
                    </AuthFieldError>
                  )}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="slug">
            {(field) => {
              const fieldInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              const invalid =
                fieldInvalid || isBlockingSlugStatus(slugStatus);
              return (
                <Field data-invalid={invalid} className="gap-1">
                  <AuthFieldLabel htmlFor={field.name}>
                    Workspace URL
                  </AuthFieldLabel>
                  <WorkspaceUrlField
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    disabled={isBusy}
                    invalid={invalid}
                    onBlur={field.handleBlur}
                    onChange={(value) => {
                      handleSlugChange(value);
                    }}
                  />
                  <SlugAvailabilityStatus status={slugStatus} />
                </Field>
              );
            }}
          </form.Field>

          <Field className="gap-1">
            <div className="flex items-center justify-between">
              <AuthFieldLabel>Team size</AuthFieldLabel>
              <span className="text-xs leading-[18px] text-muted-foreground">
                Optional
              </span>
            </div>
            <TeamSizeControl
              value={teamSize}
              onChange={setTeamSize}
              disabled={isBusy}
            />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <Link
              href={ONBOARDING_PATH.start}
              aria-disabled={isBusy}
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-10 gap-1 px-4 text-muted-foreground hover:text-foreground sm:h-9",
                isBusy && "pointer-events-none opacity-50",
              )}
            >
              <LuArrowLeft aria-hidden="true" />
              Back
            </Link>
            <Button
              type="submit"
              size="lg"
              disabled={isBusy || isBlockingSlugStatus(slugStatus)}
              className="h-10 gap-2 px-6 hover:bg-primary-hover disabled:opacity-60 sm:h-9"
            >
              {isBusy ? (
                <>
                  <LuLoaderCircle
                    className="animate-spin"
                    aria-hidden="true"
                  />
                  Creating
                </>
              ) : (
                "Create workspace"
              )}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  );
}
