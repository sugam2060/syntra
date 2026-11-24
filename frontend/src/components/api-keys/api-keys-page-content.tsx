"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useApiKeys, useCreateApiKey, useRevokeApiKey } from "@/api/api-keys";
import { useWorkspaceMembers } from "@/api/workspaces";
import { ApiKeysCard } from "@/components/api-keys/api-keys-card";
import { ApiKeysInfoBanner } from "@/components/api-keys/api-keys-info-banner";
import { ApiKeysNoAccess } from "@/components/api-keys/api-keys-no-access";
import { CreateApiKeyDialog } from "@/components/api-keys/create-api-key-dialog";
import { CreateKeyButton } from "@/components/api-keys/create-key-button";
import { RevealKeyDialog } from "@/components/api-keys/reveal-key-dialog";
import { RevokeKeyDialog } from "@/components/api-keys/revoke-key-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { buildApiKeyRows } from "@/lib/api-key-rows";
import { countActiveKeys, MAX_ACTIVE_API_KEYS } from "@/lib/api-key-status";
import { ApiError } from "@/lib/api-error";
import { getErrorMessage } from "@/lib/error-message";
import { indexMembers } from "@/lib/key-creator";
import { useWorkspace } from "@/providers/workspace-provider";
import type { ApiKeyRow } from "@/types/api-keys";

const DESCRIPTION =
  "Let other tools use Syntra's AI agents. Keys act on your behalf and are limited to this workspace.";

/** Everything on the API keys page below the shell: header, keys, and the create, reveal and revoke dialogs. */
export function ApiKeysPageContent() {
  const { workspace, access } = useWorkspace();
  const keys = useApiKeys(access.canManageApiKeys ? workspace.id : null);
  const members = useWorkspaceMembers(access.canManageApiKeys ? workspace.id : null);
  const create = useCreateApiKey(workspace.id);
  const revoke = useRevokeApiKey(workspace.id);
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyRow | null>(null);

  // The time of the last fetch, so "expires in 6 days" stays pure and moves with the data.
  const now = keys.dataUpdatedAt;
  const rows = useMemo(
    () =>
      buildApiKeyRows(keys.data ?? [], {
        now,
        members: members.data ? indexMembers(members.data) : null,
        membersLoading: members.isPending,
      }),
    [keys.data, now, members.data, members.isPending],
  );

  const isForbidden = keys.error instanceof ApiError && keys.error.status === 403;
  if (!access.canManageApiKeys || isForbidden) {
    return (
      <>
        <PageHeader title="API keys" description={DESCRIPTION} />
        <ApiKeysNoAccess />
      </>
    );
  }

  const activeCount = keys.data ? countActiveKeys(keys.data, now) : 0;
  const atLimit = activeCount >= MAX_ACTIVE_API_KEYS;
  const createButton = (
    <CreateKeyButton
      atLimit={atLimit}
      maxKeys={MAX_ACTIVE_API_KEYS}
      onClick={() => setCreateOpen(true)}
    />
  );

  function closeCreateDialog(): void {
    setCreateOpen(false);
    create.reset();
  }

  function finishReveal(): void {
    // Dropping the mutation result is what removes the plaintext key from memory and the DOM.
    create.reset();
    setCreateOpen(false);
  }

  function confirmRevoke(): void {
    if (!revokeTarget) {
      return;
    }
    revoke.mutate(revokeTarget.key.id, {
      onSuccess: () => {
        toast.success("Key revoked");
        setRevokeTarget(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, "Couldn't revoke the key. Try again."));
      },
    });
  }

  function renderCard(): React.ReactNode {
    if (keys.isPending) {
      return <ApiKeysCard state="loading" />;
    }
    if (keys.isError) {
      return (
        <ApiKeysCard
          state="error"
          message={getErrorMessage(keys.error, "Something went wrong. Try again.")}
          onRetry={() => void keys.refetch()}
        />
      );
    }
    if (rows.length === 0) {
      return <ApiKeysCard state="empty" createAction={createButton} />;
    }
    return (
      <ApiKeysCard
        state="ready"
        rows={rows}
        activeCount={activeCount}
        onRevoke={(row) => {
          revoke.reset();
          setRevokeTarget(row);
        }}
      />
    );
  }

  return (
    <>
      <PageHeader title="API keys" description={DESCRIPTION} actions={createButton} />
      <ApiKeysInfoBanner />
      {renderCard()}

      <CreateApiKeyDialog
        open={createOpen && !create.isSuccess}
        isPending={create.isPending}
        error={create.error}
        onSubmit={(request) => create.mutate(request)}
        onClose={closeCreateDialog}
      />
      {create.data && (
        <RevealKeyDialog
          createdKey={create.data}
          workspaceId={workspace.id}
          onDone={finishReveal}
        />
      )}
      {revokeTarget && (
        <RevokeKeyDialog
          keyName={revokeTarget.key.name}
          isPending={revoke.isPending}
          onConfirm={confirmRevoke}
          onClose={() => setRevokeTarget(null)}
        />
      )}
    </>
  );
}
