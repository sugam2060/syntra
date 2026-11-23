# Authorization module

Endpoint-level permission checks. A route declares the permission codes it needs; a global guard checks the signed-in user against the workspace in the URL. Role, owner and per-member override rules are not re-implemented here: they live in the SQL function `app.has_permission` (`script/sql/02-security-functions.sql`).

## Public interface

Import from `src/authorization` (barrel `index.ts`).

| Symbol | Purpose |
|---|---|
| `Permission` | Constant of the 18 permission codes, e.g. `Permission.AI_USE` (`'ai:use'`). Defined in `src/database/schemas/workspace/permission-keys.ts` |
| `PermissionKey`, `PERMISSION_KEYS` | Union type and array derived from `Permission` |
| `@RequiredPermission(...codes)` | Method or controller decorator. Several codes mean all are required. A method-level decorator overrides the controller-level one (no merging) |
| `@WorkspaceId()` | Parameter decorator. Returns the workspace id the guard validated (`request.workspaceId`) |
| `PermissionGuard` | Global guard, registered in `AppModule` |
| `PermissionService.hasAll(userId, workspaceId, codes)` | Programmatic check. One query through `app.has_permission`. `false` for a non-member, unknown workspace or unknown code; `true` for an empty list |
| `PERMISSION_DENIED_MESSAGE` | Message of the 403 body |

## Usage

```ts
@Controller('workspaces/:workspaceId/tasks')
export class TasksController {
  @Get()
  @RequiredPermission(Permission.TASK_READ)
  list(@WorkspaceId() workspaceId: string) {
    return this.tasks.list(workspaceId); // pass workspaceId to DatabaseService.withTenant
  }

  @Patch(':taskId/assignee')
  @RequiredPermission(Permission.TASK_UPDATE, Permission.TASK_ASSIGN) // needs both
  assign(@WorkspaceId() workspaceId: string) {}
}
```

The route must contain a `:workspaceId` parameter. The guard reads it from `request.params.workspaceId`; no other source (body, query, header) is used.

## Guard order

`AppModule` registers three global guards in this order:

1. `ThrottlerGuard`: rejects floods before any work.
2. `JwtAuthGuard`: validates the access token and sets `request.user` (skipped by `@Public()`).
3. `PermissionGuard`: reads the user set in step 2, so it must stay after `JwtAuthGuard`.

## Guard behaviour

| Situation | Response |
|---|---|
| Route has no `@RequiredPermission` | Not checked. Any signed-in user passes |
| No authenticated user (including a `@Public()` route that also has `@RequiredPermission`) | `401` |
| `:workspaceId` missing or not a UUID | `400` `The workspaceId route parameter must be a valid UUID` |
| User is not a member, lacks a code, or the workspace does not exist | `403`, identical body for all three: `{ "statusCode": 403, "error": "Forbidden", "message": "You do not have permission to perform this action" }` |
| Allowed | Handler runs, `request.workspaceId` is set |

The three 403 causes share one body so the API does not reveal which workspaces exist.

Permission rules (from `app.has_permission`):

- The workspace owner has every permission.
- Otherwise the member's role permissions apply.
- A per-member override beats the role: `deny` removes a permission the role grants, `allow` adds one it does not.

## Caveat: the check is opt-in

A route without `@RequiredPermission` is not permission-checked. Every future workspace-scoped route must carry the decorator, otherwise any signed-in user can call it for any workspace. Row level security still limits what `withTenant` queries return, but do not rely on it as the only check.

## Add a permission

1. Add one line to `Permission` in `src/database/schemas/workspace/permission-keys.ts`.
2. Generate a custom migration (`npm run db:generate:custom`) and add the matching `INSERT INTO permissions` row, plus `role_permissions` rows for the system roles that should get it.
3. Run `npm run db:migrate`.

`test/database/rls.e2e-spec.ts` compares `PERMISSION_KEYS` with the seeded `permissions` table and fails if they drift. Existing seed: `drizzle/0001_seed_rbac_and_triggers.sql`.

The Drizzle row type for the `permissions` table is `PermissionRecord` (not `Permission`, which is the constant).

## Tests

- Unit: `src/authorization/test/` (`npm test`): decorators, constant, guard, service.
- Integration and HTTP: `test/authorization/` (`npm run test:e2e`; needs the containers up and `npm run db:migrate` applied). `permission-service.e2e-spec.ts` checks owner, roles and overrides against the real database. `permission-guard.e2e-spec.ts` mounts a test-only `ProbeController` under `/workspaces/:workspaceId/probe`, because the app has no workspace-scoped controller yet.
