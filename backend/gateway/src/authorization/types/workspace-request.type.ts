import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/types';

/** Request as seen by the permission guard. `workspaceId` is set once access is granted. */
export type WorkspaceRequest = Request & {
  user?: AuthenticatedUser;
  workspaceId?: string;
};
