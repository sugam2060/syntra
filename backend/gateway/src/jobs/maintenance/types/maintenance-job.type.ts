/** BullMQ queue name for housekeeping jobs. */
export const MAINTENANCE_QUEUE = 'maintenance';

/** Names of the jobs on `MAINTENANCE_QUEUE`; the processor ignores any other name. */
export enum MaintenanceJobName {
  PurgeExpiredAuthData = 'purge-expired-auth-data',
}

/** How many rows one purge run removed, per kind. */
export interface PurgeResult {
  sessionsDeleted: number;
  tokensDeleted: number;
  apiKeysDeleted: number;
}
