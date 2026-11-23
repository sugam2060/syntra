/** One HTTP route as seen by the audit. */
export interface RouteInfo {
  controller: string;
  handler: string;
  httpMethod: string;
  /** Controller path and handler path joined, without the global prefix. */
  path: string;
  requiresPermission: boolean;
  isPublic: boolean;
}
