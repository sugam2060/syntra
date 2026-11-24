# Maintenance jobs

Housekeeping on the BullMQ queue `maintenance` (`MAINTENANCE_QUEUE`). One job exists: `purge-expired-auth-data` (`MaintenanceJobName.PurgeExpiredAuthData`), which deletes expired authentication data. Needs Redis (`REDIS_HOST`, `REDIS_PORT`).

## Flow

1. `MaintenanceScheduler.onModuleInit` calls `queue.upsertJobScheduler` with the cron pattern from `AUTH_CLEANUP_CRON`. The call is idempotent: every gateway instance may run it and only one schedule exists. Changing the pattern replaces the old schedule on the next start.
2. At each tick BullMQ adds one job. `MaintenanceProcessor` (concurrency 1) runs it through `AuthDataPurgeService.purge()`.
3. `purge()` runs `SELECT * FROM app.auth_purge_expired()` (`script/sql/02-security-functions.sql`). The function is `SECURITY DEFINER` because row level security hides other users' rows from the application role.
4. The processor logs the counts only (never row contents) and returns `{ sessionsDeleted, tokensDeleted, apiKeysDeleted }` as the job result.

Scheduled job options: `removeOnComplete: true`, `removeOnFail: 100`.

## What is deleted

The retention rules live in `app.auth_purge_expired()`. The same run also calls `app.purge_workspace_invitations()`, which deletes workspace invitations that were accepted, revoked or expired more than 30 days ago (`PurgeResult.invitationsDeleted`).

| Data | Deleted when |
|---|---|
| `sessions` | `expires_at` is more than 1 day in the past |
| `verification_tokens` | `expires_at` or `consumed_at` is more than 7 days in the past |
| `api_keys` | `revoked_at` or `expires_at` is more than 90 days in the past |

Sessions that were revoked but have not expired are kept on purpose: refresh-token reuse detection needs them until they expire. Changing a retention period means editing the SQL function and running `npm run db:migrate` (the SQL files are re-applied on every run).

## Config

| Env var | Required | Default | Purpose |
|---|---|---|---|
| `AUTH_CLEANUP_CRON` | no | `0 3 * * *` | Five-field cron pattern of the purge. Validated at startup (`src/config/env.validation.ts`); read as `app.maintenance.authCleanupCron` |

## Failure behavior

- If scheduling fails at boot (for example Redis is down), the error is logged and the application keeps starting. The schedule is registered again on the next start.
- A failing purge throws inside the processor, so BullMQ marks the job failed (the last 100 failed jobs are kept). The next tick runs again.
- A job with an unknown name is ignored with a warning.

## Files

| File | Role |
|---|---|
| `maintenance.module.ts` | Registers the queue, scheduler, processor and purge service. Exports `AuthDataPurgeService` |
| `maintenance.scheduler.ts` | Registers the repeatable job |
| `maintenance.processor.ts` | Worker for the queue |
| `auth-data-purge.service.ts` | Calls the SQL function and converts the bigint counts to numbers |
| `types/maintenance-job.type.ts` | Queue name, job name enum, `PurgeResult` |

To add a job: add a name to `MaintenanceJobName`, schedule it in the scheduler and handle it in `MaintenanceProcessor.process`.

## Tests

- Unit: `src/jobs/maintenance/test/maintenance.spec.ts` (`npm test`).
- Integration: `test/maintenance/purge.e2e-spec.ts` (`npm run test:e2e`; needs the containers up and `npm run db:migrate` applied). It checks what is removed and that live and reuse-detection data survive.
