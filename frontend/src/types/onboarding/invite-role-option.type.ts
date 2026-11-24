import type { InviteMembersInput } from "@/types/schema";

export type InviteRoleKey = InviteMembersInput["role"];

export type InviteRoleOption = {
  key: InviteRoleKey;
  label: string;
  description: string;
};
