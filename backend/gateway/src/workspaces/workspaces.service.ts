import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueViolation } from '../common/utils/postgres-error.util';
import type { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto';
import type { MyWorkspace, SlugAvailability } from './types';
import { getSlugProblem } from './utils/slug.util';
import { WorkspacesRepository } from './workspaces.repository';

const SLUG_TAKEN_MESSAGE = 'That URL is already in use';
const SLUG_RESERVED_MESSAGE = 'That URL is reserved';

/** Workspace lifecycle for the signed-in user. Access itself is enforced by guards and row level security. */
@Injectable()
export class WorkspacesService {
  constructor(private readonly workspaces: WorkspacesRepository) {}

  /**
   * Creates a workspace owned by the caller.
   * @throws BadRequestException the slug is reserved
   * @throws ConflictException the slug is taken
   */
  async create(userId: string, dto: CreateWorkspaceDto): Promise<MyWorkspace> {
    this.assertSlugNotReserved(dto.slug);
    try {
      return await this.workspaces.create(userId, { name: dto.name, slug: dto.slug });
    } catch (error) {
      throw this.translateSlugCollision(error);
    }
  }

  listMine(userId: string): Promise<MyWorkspace[]> {
    return this.workspaces.listForUser(userId);
  }

  /** @throws NotFoundException the caller is not a member, or the workspace does not exist */
  async getById(userId: string, workspaceId: string): Promise<MyWorkspace> {
    return this.orNotFound(await this.workspaces.findById(userId, workspaceId));
  }

  /** @throws NotFoundException the caller is not a member, or the slug does not exist */
  async getBySlug(userId: string, slug: string): Promise<MyWorkspace> {
    return this.orNotFound(await this.workspaces.findBySlug(userId, slug));
  }

  /** Never throws for a bad slug: the reason is part of the answer so a form can show it inline. */
  async checkSlug(userId: string, slug: string): Promise<SlugAvailability> {
    const problem = getSlugProblem(slug);
    if (problem) return { slug, available: false, reason: problem };

    const available = await this.workspaces.isSlugAvailable(userId, slug);
    return { slug, available, reason: available ? null : 'taken' };
  }

  /**
   * @throws BadRequestException nothing to change, or the slug is reserved
   * @throws ConflictException the slug is taken
   * @throws NotFoundException the workspace is gone or the caller may not update it
   */
  async update(
    userId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<MyWorkspace> {
    const patch = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
    };
    if (Object.keys(patch).length === 0) {
      throw new BadRequestException('Provide a name or a slug to update');
    }
    if (dto.slug !== undefined) this.assertSlugNotReserved(dto.slug);

    try {
      return this.orNotFound(await this.workspaces.update(userId, workspaceId, patch));
    } catch (error) {
      throw this.translateSlugCollision(error);
    }
  }

  /** @throws NotFoundException the workspace is gone or the caller may not delete it */
  async remove(userId: string, workspaceId: string): Promise<void> {
    if (!(await this.workspaces.remove(userId, workspaceId))) {
      throw new NotFoundException('Workspace not found');
    }
  }

  private assertSlugNotReserved(slug: string): void {
    if (getSlugProblem(slug) === 'reserved') {
      throw new BadRequestException(SLUG_RESERVED_MESSAGE);
    }
  }

  /** Maps a unique violation to 409 and passes every other error (including HTTP ones) through. */
  private translateSlugCollision(error: unknown): unknown {
    return isUniqueViolation(error) ? new ConflictException(SLUG_TAKEN_MESSAGE) : error;
  }

  private orNotFound(workspace: MyWorkspace | null): MyWorkspace {
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }
}
