/** Tabs of the members page. */
export const MEMBERS_TAB = {
  members: "members",
  invitations: "invitations",
  roles: "roles",
} as const;

export type MembersTab = (typeof MEMBERS_TAB)[keyof typeof MEMBERS_TAB];
