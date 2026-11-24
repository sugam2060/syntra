import type { KeyCreator } from "@/types/api-keys";
import type { WorkspaceMember } from "@/types/shared";

/** Indexes the member list by user id, so each table row looks its creator up in constant time. */
export function indexMembers(
  members: readonly WorkspaceMember[],
): ReadonlyMap<string, WorkspaceMember> {
  return new Map(members.map((member) => [member.userId, member]));
}

/**
 * The gateway lists a key's creator by id only, so the name comes from the member list. `members` is
 * null while that list loads or when it failed; a creator who is not in it reads as unknown.
 */
export function resolveKeyCreator(
  createdBy: string,
  members: ReadonlyMap<string, WorkspaceMember> | null,
  isLoading: boolean,
): KeyCreator {
  if (isLoading) {
    return { kind: "loading" };
  }
  const member = members?.get(createdBy);
  if (!member) {
    return { kind: "unknown" };
  }
  return {
    kind: "member",
    name: member.name ?? member.email,
    email: member.email,
    avatarUrl: member.avatarUrl,
  };
}
