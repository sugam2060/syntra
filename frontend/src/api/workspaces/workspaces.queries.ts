import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  InviteMembersRequest,
  ReplacePermissionOverridesRequest,
  RoleInput,
  UpdateWorkspaceInput,
} from "@/types/schema";
import type {
  JoinedWorkspace,
  WorkspaceMember,
  Workspace,
} from "@/types/shared";

import {
  acceptInvitation,
  acceptInvitationByToken,
  changeMemberRole,
  checkSlugAvailability,
  createRole,
  createWorkspace,
  declineInvitation,
  deleteRole,
  getMemberPermissionOverrides,
  getWorkspaceById,
  getWorkspaceBySlug,
  inviteMembers,
  listMembers,
  listMyInvitations,
  listMyWorkspaces,
  listWorkspaceInvitations,
  listWorkspacePermissions,
  listWorkspaceRoles,
  previewInvitation,
  removeMember,
  replaceMemberPermissionOverrides,
  resendInvitation,
  revokeInvitation,
  updateRole,
  deleteWorkspace,
  leaveWorkspace,
  updateWorkspace,
} from "./workspaces.api";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  mine: () => [...workspaceKeys.all, "mine"] as const,
  slugAvailability: (slug: string) =>
    [...workspaceKeys.all, "slug-availability", slug] as const,
  bySlugAll: () => [...workspaceKeys.all, "by-slug"] as const,
  bySlug: (slug: string) => [...workspaceKeys.bySlugAll(), slug] as const,
  roles: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, "roles"] as const,
  permissions: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, "permissions"] as const,
  members: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, "members"] as const,
  memberOverrides: (workspaceId: string, userId: string) =>
    [...workspaceKeys.all, workspaceId, "members", userId, "overrides"] as const,
  invitations: (workspaceId: string) =>
    [...workspaceKeys.all, workspaceId, "invitations"] as const,
  myInvitations: () => ["invitations", "mine"] as const,
  byId: (workspaceId: string) =>
    [...workspaceKeys.all, "by-id", workspaceId] as const,
  /** Outside `workspaceKeys.all`: a preview is public data about a token, not about a workspace the user belongs to. */
  invitationPreview: (token: string) => ["invitations", "preview", token] as const,
};

/**
 * Live availability check for a slug. Pass `null` to skip it. Never retried: the route is strictly
 * rate limited and a retry would only make that worse.
 */
export function useSlugAvailability(slug: string | null) {
  return useQuery({
    queryKey: workspaceKeys.slugAvailability(slug ?? ""),
    queryFn: () => checkSlugAvailability(slug ?? ""),
    enabled: slug !== null,
    retry: false,
    staleTime: 30 * 1000,
  });
}

/** The workspaces the signed-in user belongs to. Refreshed whenever a workspace is created or joined. */
export function useMyWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.mine(),
    queryFn: listMyWorkspaces,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/** Resolves a slug from the URL to the workspace. Pass `null` to skip. */
export function useWorkspaceBySlug(slug: string | null) {
  return useQuery({
    queryKey: workspaceKeys.bySlug(slug ?? ""),
    queryFn: () => getWorkspaceBySlug(slug ?? ""),
    enabled: slug !== null,
    retry: false,
  });
}

/** Roles of a workspace. Pass `null` until the workspace id is known. */
export function useWorkspaceRoles(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceKeys.roles(workspaceId ?? ""),
    queryFn: () => listWorkspaceRoles(workspaceId ?? ""),
    enabled: workspaceId !== null,
  });
}

export function useInviteMembers(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMembersRequest) =>
      inviteMembers(workspaceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(workspaceId),
      });
    },
  });
}

export function useMyInvitations() {
  return useQuery({
    queryKey: workspaceKeys.myInvitations(),
    queryFn: listMyInvitations,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.myInvitations(),
      });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.myInvitations(),
      });
    },
  });
}

/** A workspace by id. Pass `null` until the id is known. */
export function useWorkspaceById(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceKeys.byId(workspaceId ?? ""),
    queryFn: () => getWorkspaceById(workspaceId ?? ""),
    enabled: workspaceId !== null,
    retry: false,
  });
}

/**
 * What `/invitations/accept` shows for the emailed token, fetched once per token: the route is strictly
 * rate limited, so it is never retried and never refetched on focus, mount or reconnect. Pass `null` to skip.
 */
export function useInvitationPreview(token: string | null) {
  return useQuery({
    queryKey: workspaceKeys.invitationPreview(token ?? ""),
    queryFn: () => previewInvitation(token ?? ""),
    enabled: token !== null,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * Accepts by the emailed token, then looks the workspace up so the caller can navigate to its slug.
 * A failed lookup does not fail the mutation (the invitation is already accepted): `slug` is null then.
 */
export function useAcceptInvitationByToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string): Promise<JoinedWorkspace> => {
      const { workspaceId } = await acceptInvitationByToken(token);
      try {
        const workspace = await queryClient.fetchQuery({
          queryKey: workspaceKeys.byId(workspaceId),
          queryFn: () => getWorkspaceById(workspaceId),
        });
        return { workspaceId, slug: workspace.slug };
      } catch {
        return { workspaceId, slug: null };
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.myInvitations(),
      });
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

/** Removes the cached by-slug lookups of a workspace, except the one for `keepSlug`. */
function removeSlugLookups(
  queryClient: QueryClient,
  workspaceId: string,
  keepSlug: string | null,
): void {
  queryClient.removeQueries({
    queryKey: workspaceKeys.bySlugAll(),
    predicate: (query) => {
      const cached = query.state.data as Workspace | undefined;
      return cached?.id === workspaceId && cached.slug !== keepSlug;
    },
  });
}

/** Forgets everything cached about a workspace the caller no longer has, and drops it from their list. */
function forgetWorkspace(queryClient: QueryClient, workspaceId: string): void {
  removeSlugLookups(queryClient, workspaceId, null);
  queryClient.removeQueries({ queryKey: workspaceKeys.byId(workspaceId) });
  queryClient.removeQueries({ queryKey: [...workspaceKeys.all, workspaceId] });
  queryClient.setQueryData<Workspace[]>(workspaceKeys.mine(), (mine) =>
    mine?.filter((workspace) => workspace.id !== workspaceId),
  );
  void queryClient.invalidateQueries({ queryKey: workspaceKeys.mine() });
}

/**
 * Updates the workspace's name and/or URL. On success the answer seeds the lookups for the (possibly
 * new) slug and the old slug's lookup is dropped, so the caller can navigate to the new URL at once.
 */
export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkspaceInput) =>
      updateWorkspace(workspaceId, input),
    onSuccess: (workspace) => {
      queryClient.setQueryData(workspaceKeys.bySlug(workspace.slug), workspace);
      queryClient.setQueryData(workspaceKeys.byId(workspaceId), workspace);
      removeSlugLookups(queryClient, workspaceId, workspace.slug);
      void queryClient.invalidateQueries({ queryKey: workspaceKeys.mine() });
    },
  });
}

/** Deletes the workspace (owner only). The caller should leave the workspace's routes afterwards. */
export function useDeleteWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteWorkspace(workspaceId),
    onSuccess: () => {
      forgetWorkspace(queryClient, workspaceId);
    },
  });
}

/** Leaves the workspace (everyone but the owner). The caller should leave the workspace's routes afterwards. */
export function useLeaveWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveWorkspace(workspaceId),
    onSuccess: () => {
      forgetWorkspace(queryClient, workspaceId);
    },
  });
}

/** The permission catalogue of a workspace, shared by the role, override and API key editors. Pass `null` until the id is known. */
export function useWorkspacePermissions(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceKeys.permissions(workspaceId ?? ""),
    queryFn: () => listWorkspacePermissions(workspaceId ?? ""),
    enabled: workspaceId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

/** Members of a workspace. Pass `null` until the workspace id is known. */
export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId ?? ""),
    queryFn: () => listMembers(workspaceId ?? ""),
    enabled: workspaceId !== null,
  });
}

/** Replaces the member in the cached list with the answer, so the role pill updates without waiting for a refetch. */
export function useChangeMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      changeMemberRole(workspaceId, userId, { roleId }),
    onSuccess: (updated) => {
      queryClient.setQueryData<WorkspaceMember[]>(
        workspaceKeys.members(workspaceId),
        (members) =>
          members?.map((member) =>
            member.userId === updated.userId ? updated : member,
          ),
      );
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeMember(workspaceId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
    },
  });
}

/** Overrides of one member. Pass `null` until a member is chosen. */
export function useMemberPermissionOverrides(
  workspaceId: string,
  userId: string | null,
) {
  return useQuery({
    queryKey: workspaceKeys.memberOverrides(workspaceId, userId ?? ""),
    queryFn: () => getMemberPermissionOverrides(workspaceId, userId ?? ""),
    enabled: userId !== null,
    gcTime: 0,
  });
}

/** Replaces the member's whole override set (`[]` clears it) and stores the answer as the new state. */
export function useReplaceMemberPermissionOverrides(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: ReplacePermissionOverridesRequest;
    }) => replaceMemberPermissionOverrides(workspaceId, userId, input),
    onSuccess: (overrides, { userId }) => {
      queryClient.setQueryData(
        workspaceKeys.memberOverrides(workspaceId, userId),
        overrides,
      );
    },
  });
}

export function useCreateRole(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RoleInput) => createRole(workspaceId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.roles(workspaceId),
      });
    },
  });
}

/** A rename also changes the role name shown in the member and invitation lists. */
export function useUpdateRole(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, input }: { roleId: string; input: RoleInput }) =>
      updateRole(workspaceId, roleId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.roles(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(workspaceId),
      });
    },
  });
}

export function useDeleteRole(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => deleteRole(workspaceId, roleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.roles(workspaceId),
      });
    },
  });
}

/**
 * Open invitations, expired ones included. Needs `member:invite`, so pass `enabled: false` for people
 * who cannot manage members instead of letting the request fail with a 403.
 */
export function useWorkspaceInvitations(
  workspaceId: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: workspaceKeys.invitations(workspaceId),
    queryFn: () => listWorkspaceInvitations(workspaceId),
    enabled,
  });
}

export function useResendInvitation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      resendInvitation(workspaceId, invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(workspaceId),
      });
    },
  });
}

export function useRevokeInvitation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      revokeInvitation(workspaceId, invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.invitations(workspaceId),
      });
    },
  });
}
