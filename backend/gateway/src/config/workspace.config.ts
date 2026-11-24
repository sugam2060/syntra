import { registerAs } from '@nestjs/config';
import type { WorkspaceConfig } from './types';

export const WORKSPACE_CONFIG_KEY = 'workspace';

export default registerAs(
  WORKSPACE_CONFIG_KEY,
  (): WorkspaceConfig => ({
    invitationTtlDays: Number(process.env.INVITATION_TTL_DAYS ?? 7),
  }),
);
