# 13 — Members and invitations

Route `/w/:workspace/members` · Backend 🕓 endpoints not built; schema ✅ (`workspace_members`, `workspace_roles` with system roles Owner/Admin/Member/Viewer, `member_permission_overrides` allow/deny, `workspace_invitations` with `expires_at`, `accepted_at`, `revoked_at`) · permissions `member:invite|remove|update_role`

Follow `00-design-system.md`. Paste its Stitch preamble first.

## Behavior notes

- Roles: Owner (all permissions, one per workspace, cannot be removed), Admin (everything except `workspace:delete`), Member, Viewer. Custom roles may appear later.
- Per-member permission overrides (allow / deny a single permission) are an advanced option inside the member drawer.
- Invitations: email + role, one pending invite per email per workspace, can be revoked, expire. Invitee must verify their email.
- Hide invite/remove/role controls without the matching permission.

## Prompt

```
Screen set: Members and invitations for Syntra inside the standard app shell ("Members" active).

Header: H1 "Members", muted "7 members · 2 pending invitations", primary button "Invite people" (hidden for Viewer role).
Tabs: "Members (7)", "Invitations (2)", "Roles & permissions".

Frame A — Members tab: toolbar with search "Search members" and role filter "All roles ▾". Table with columns Member (avatar, name, email muted), Role (select pill, disabled for the Owner with a crown icon and tooltip "Workspace owner"), Status (Active green, Pending amber), Last active, and a three-dot menu (Change role, Edit permissions, Remove from workspace in danger). Rows: Maya Chen (Owner), Jonas Weber (Admin), Priya Nair (Member), Leo Santos (Member), Aisha Khan (Viewer), and two more.

Frame B — Invite dialog (520px): multi-email chip input, role select with descriptions (Admin: "Manage members and settings", Member: "Create and edit tasks", Viewer: "Read-only access"), an optional personal message textarea, info note "Invitees must verify their email. Links expire in 7 days.", buttons "Cancel" and "Send invites".

Frame C — Invitations tab: table with Email, Role, Invited by (avatar + name), Sent, Expires in, Status pill (Pending, Expired in warning), actions "Resend" and "Revoke" (danger ghost). Include an empty variant "No pending invitations".

Frame D — Member drawer "Edit permissions" (right side, 480px): header with avatar and name, role select, a section "Permission overrides" (muted explanation "Overrides beat the role"), grouped permission list (Workspace, Members, Projects, Tasks, Comments, AI) where each permission shows its code in mono (e.g. task:assign), the effective state from the role, and a three-way segmented control Default | Allow | Deny with changed rows highlighted. Footer "Reset overrides" (ghost) and "Save changes" (primary).

Frame E — Remove member confirmation dialog: "Remove Priya Nair?" with explanation "Their tasks stay but become unassigned." and a destructive button.
Frame F — Roles & permissions tab: matrix with permission rows and role columns (Owner, Admin, Member, Viewer) showing check/dash icons, read-only.
Frame G — Viewer role view with all management controls hidden. Frame H — mobile (390px) member cards.
Light theme plus one dark frame of Frame A.
```
