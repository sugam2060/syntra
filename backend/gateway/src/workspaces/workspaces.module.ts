import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthorizationModule } from '../authorization/authorization.module';
import appConfig from '../config/app.config';
import workspaceConfig from '../config/workspace.config';
import { EmailModule } from '../jobs/email/email.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsRepository } from './invitations.repository';
import { InvitationsService } from './invitations.service';
import { MembersController } from './members.controller';
import { MembersRepository } from './members.repository';
import { MembersService } from './members.service';
import { MyInvitationsController } from './my-invitations.controller';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspacesService } from './workspaces.service';

/**
 * Workspaces: lifecycle, slug lookup, members, roles, permission overrides and invitations. One
 * module for the whole tenant-management surface; other feature modules (projects, tasks) depend
 * on it only through the workspace id carried in their routes.
 */
@Module({
  imports: [
    AuthorizationModule,
    EmailModule,
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(workspaceConfig),
  ],
  controllers: [
    WorkspacesController,
    MembersController,
    RolesController,
    InvitationsController,
    MyInvitationsController,
  ],
  providers: [
    WorkspacesService,
    WorkspacesRepository,
    MembersService,
    MembersRepository,
    RolesService,
    RolesRepository,
    InvitationsService,
    InvitationsRepository,
  ],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
