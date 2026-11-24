"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { toast } from "sonner";

import { useUpdateWorkspace } from "@/api/workspaces";
import { AuthBanner } from "@/components/shared/auth-banner";
import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthFieldLabel } from "@/components/shared/auth-field-label";
import { AuthInput } from "@/components/shared/auth-input";
import { SlugAvailabilityStatus } from "@/components/shared/slug-availability-status";
import { WorkspaceUrlField } from "@/components/shared/workspace-url-field";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { SettingsSectionCard } from "@/components/workspace-settings/settings-section-card";
import { UnsavedChangesBar } from "@/components/workspace-settings/unsaved-changes-bar";
import { useSlugStatus } from "@/hooks/use-slug-status";
import { ApiError } from "@/lib/api-error";
import { workspacePaths } from "@/lib/workspace-paths";
import { useWorkspace } from "@/providers/workspace-provider";
import {
  type UpdateWorkspaceInput,
  createWorkspaceSchema,
  WORKSPACE_NAME_MAX_LENGTH,
} from "@/types/schema";
import {
  AUTH_BANNER_VARIANT,
  SLUG_STATUS,
  type SlugStatus,
} from "@/types/shared";
import type {
  UpdateWorkspaceStatus,
  WorkspaceProfileValues,
} from "@/types/workspace-settings";

const IDLE: UpdateWorkspaceStatus = { kind: "idle" };

const URL_HELPER = "Changing the URL breaks existing links.";
const URL_FORMAT_HELPER =
  "Use 3 to 48 lowercase letters, numbers and single hyphens.";

function statusFromError(error: unknown): UpdateWorkspaceStatus {
  if (!(error instanceof ApiError)) {
    return { kind: "error", message: "Something went wrong. Try again." };
  }
  switch (error.status) {
    case 403:
      return { kind: "forbidden" };
    case 409:
      return { kind: "slug-taken" };
    case 429:
      return { kind: "rate-limited" };
    default:
      return { kind: "error", message: error.message };
  }
}

/** Statuses that say the typed URL cannot be saved (or not yet). */
function isBlockingSlugStatus(status: SlugStatus): boolean {
  return (
    status === SLUG_STATUS.taken ||
    status === SLUG_STATUS.reserved ||
    status === SLUG_STATUS.invalid ||
    status === SLUG_STATUS.checking
  );
}

/** Statuses that mark the URL field itself as invalid ("checking" is not a verdict yet). */
function isRejectedSlugStatus(status: SlugStatus): boolean {
  return (
    status === SLUG_STATUS.taken ||
    status === SLUG_STATUS.reserved ||
    status === SLUG_STATUS.invalid
  );
}

/**
 * The "Workspace profile" card: name and URL. Admins and owners edit it; everyone else sees it
 * read-only. Renders the card plus, while there are unsaved changes, the bar pinned to the bottom.
 */
export function WorkspaceProfileSection() {
  const router = useRouter();
  const { workspace, access } = useWorkspace();
  const updateWorkspace = useUpdateWorkspace(workspace.id);
  const formId = useId();
  const canEdit = access.canUpdateWorkspace;
  const isSaving = updateWorkspace.isPending;

  const [baseline, setBaseline] = useState<WorkspaceProfileValues>({
    name: workspace.name,
    slug: workspace.slug,
  });
  const [status, setStatus] = useState<UpdateWorkspaceStatus>(IDLE);

  const form = useForm({
    defaultValues: baseline,
    validators: { onChange: createWorkspaceSchema },
    onSubmit: async ({ value }) => {
      const name = value.name.trim();
      const slug = value.slug.trim();
      const changes: UpdateWorkspaceInput = {
        ...(name !== baseline.name && { name }),
        ...(slug !== baseline.slug && { slug }),
      };
      if (Object.keys(changes).length === 0) {
        return;
      }

      setStatus(IDLE);
      try {
        const updated = await updateWorkspace.mutateAsync(changes);
        const saved: WorkspaceProfileValues = {
          name: updated.name,
          slug: updated.slug,
        };
        setBaseline(saved);
        form.reset(saved);
        toast.success("Workspace updated");
        if (updated.slug !== baseline.slug) {
          // The page and its workspace lookup are keyed by the old slug, so move to the new URL.
          router.replace(workspacePaths.settings(updated.slug));
        }
      } catch (error: unknown) {
        setStatus(statusFromError(error));
      }
    },
  });

  const values = useStore(form.store, (state) => state.values);
  const isValid = useStore(form.store, (state) => state.isValid);
  const checkedStatus = useSlugStatus(values.slug, baseline.slug);
  const isSlugTakenByServer = status.kind === "slug-taken";
  const slugStatus: SlugStatus = isSlugTakenByServer
    ? SLUG_STATUS.idle
    : checkedStatus;

  const isDirty =
    values.name.trim() !== baseline.name ||
    values.slug.trim() !== baseline.slug;
  const canSave =
    canEdit &&
    isDirty &&
    isValid &&
    !isSaving &&
    !isSlugTakenByServer &&
    !isBlockingSlugStatus(slugStatus);

  function handleDiscard(): void {
    form.reset(baseline);
    setStatus(IDLE);
  }

  return (
    <>
      <SettingsSectionCard
        titleId="workspace-profile-heading"
        title="Workspace profile"
        description="The name and URL your team sees."
      >
        <form
          id={formId}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (canSave) {
              void form.handleSubmit();
            }
          }}
        >
          <div className="flex flex-col gap-4 p-4">
            {status.kind === "forbidden" && (
              <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
                You need the Admin role to change workspace settings.
              </AuthBanner>
            )}
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

            <FieldGroup className="gap-5">
              <form.Field name="name">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={invalid} className="gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <AuthFieldLabel htmlFor={`${formId}-${field.name}`}>
                          Workspace name
                        </AuthFieldLabel>
                        <span
                          className="text-xs leading-4 text-muted-foreground tabular-nums"
                          aria-hidden="true"
                        >
                          {field.state.value.length}/{WORKSPACE_NAME_MAX_LENGTH}
                        </span>
                      </div>
                      <AuthInput
                        id={`${formId}-${field.name}`}
                        name={field.name}
                        type="text"
                        autoComplete="organization"
                        maxLength={WORKSPACE_NAME_MAX_LENGTH}
                        value={field.state.value}
                        readOnly={!canEdit}
                        disabled={isSaving}
                        aria-invalid={invalid}
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          field.handleChange(event.target.value);
                        }}
                        className={
                          canEdit ? undefined : "bg-surface dark:bg-card"
                        }
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
                    fieldInvalid ||
                    isSlugTakenByServer ||
                    isRejectedSlugStatus(slugStatus);
                  return (
                    <Field data-invalid={invalid} className="gap-1">
                      <AuthFieldLabel htmlFor={`${formId}-${field.name}`}>
                        Workspace URL
                      </AuthFieldLabel>
                      <WorkspaceUrlField
                        id={`${formId}-${field.name}`}
                        name={field.name}
                        value={field.state.value}
                        disabled={isSaving}
                        readOnly={!canEdit}
                        invalid={invalid}
                        onBlur={field.handleBlur}
                        onChange={(value) => {
                          if (isSlugTakenByServer) {
                            setStatus(IDLE);
                          }
                          field.handleChange(value.toLowerCase());
                        }}
                      />
                      {isSlugTakenByServer ? (
                        <div className="pt-1">
                          <AuthFieldError>
                            That URL is already in use.
                          </AuthFieldError>
                        </div>
                      ) : (
                        <SlugAvailabilityStatus status={slugStatus} />
                      )}
                      {canEdit && (
                        <FieldDescription className="text-xs leading-[18px]">
                          {slugStatus === SLUG_STATUS.invalid
                            ? URL_HELPER
                            : `${URL_HELPER} ${URL_FORMAT_HELPER}`}
                        </FieldDescription>
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            {canEdit ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  disabled={!isDirty || isSaving}
                  onClick={handleDiscard}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
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
                    "Save changes"
                  )}
                </Button>
              </>
            ) : (
              <p className="mr-auto text-sm leading-[21px] text-muted-foreground">
                Only admins can change workspace settings.
              </p>
            )}
          </div>
        </form>
      </SettingsSectionCard>

      {canEdit && isDirty && (
        <UnsavedChangesBar
          formId={formId}
          canSave={canSave}
          isSaving={isSaving}
          onDiscard={handleDiscard}
        />
      )}
    </>
  );
}
