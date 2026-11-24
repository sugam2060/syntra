import type { WorkspaceMember } from "@/types/shared";

/** Value of the role filter that shows everyone. */
export const ALL_ROLES_FILTER = "all";

/** Members whose name or email contains the search text (case-insensitive) and who hold the chosen role. */
export function filterMembers(
  members: readonly WorkspaceMember[],
  search: string,
  roleFilter: string,
): WorkspaceMember[] {
  const query = search.trim().toLowerCase();
  return members.filter((member) => {
    if (roleFilter !== ALL_ROLES_FILTER && member.role.id !== roleFilter) {
      return false;
    }
    if (query === "") {
      return true;
    }
    return (
      (member.name ?? "").toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });
}
