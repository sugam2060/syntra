import { Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { toDate } from '../common/utils/date.util';
import { DatabaseService } from '../database/database.service';
import {
  oauthAccounts,
  sessions,
  userCredentials,
  users,
  verificationTokens,
} from '../database/schemas';
import type {
  AuthUserSummary,
  SignInMethods,
  UnlinkResult,
  LoginLookupRow,
  OAuthAccountLookup,
  OAuthProfile,
  PasswordResetTarget,
  RequestContext,
  SessionRotationResult,
  SessionRotationStatus,
  VerificationTokenType,
} from './types';

interface LoginLookupRecord extends Record<string, unknown> {
  id: string;
  email: string;
  name: string | null;
  email_verified_at: Date | string | null;
  is_active: boolean;
  password_hash: string | null;
}

/**
 * All SQL for authentication. Calls made before a user is known go through the narrow
 * `app.auth_*` SECURITY DEFINER functions; once the user is known everything runs inside
 * `withTenant` so row level security applies.
 */
@Injectable()
export class AuthenticationRepository {
  constructor(private readonly database: DatabaseService) {}

  async findUserByEmail(email: string): Promise<LoginLookupRow | null> {
    const { rows } = await this.database.db.execute<LoginLookupRecord>(
      sql`SELECT * FROM app.auth_find_user_by_email(${email})`,
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          email: row.email,
          name: row.name,
          emailVerifiedAt: toDate(row.email_verified_at),
          isActive: row.is_active,
          passwordHash: row.password_hash,
        }
      : null;
  }

  /** Creates a user with a password credential. Throws a unique violation on duplicate email. */
  async createUserWithPassword(input: {
    email: string;
    name: string | null;
    passwordHash: string;
  }): Promise<string> {
    const { rows } = await this.database.db.execute<{ id: string }>(
      sql`SELECT app.auth_create_user(${input.email}, ${input.name}, ${input.passwordHash}, false) AS id`,
    );
    return rows[0].id;
  }

  async createSession(
    userId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    context: RequestContext,
  ): Promise<void> {
    await this.database.withTenant({ userId }, (tx) =>
      tx.insert(sessions).values({
        userId,
        refreshTokenHash,
        userAgent: context.userAgent,
        ip: context.ip,
        expiresAt,
      }),
    );
  }

  async rotateSession(
    oldHash: string,
    newHash: string,
    expiresAt: Date,
    context: RequestContext,
  ): Promise<SessionRotationResult> {
    const { rows } = await this.database.db.execute<{
      user_id: string | null;
      status: SessionRotationStatus;
    }>(
      sql`SELECT * FROM app.auth_rotate_session(${oldHash}, ${newHash}, ${expiresAt.toISOString()}::timestamptz, ${context.userAgent}, ${context.ip}::inet)`,
    );
    return { userId: rows[0].user_id, status: rows[0].status };
  }

  async revokeSessionByHash(refreshTokenHash: string): Promise<void> {
    await this.database.db.execute(
      sql`SELECT app.auth_revoke_session(${refreshTokenHash})`,
    );
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.database.withTenant({ userId }, (tx) =>
      tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt))),
    );
  }

  async getUserProfile(userId: string): Promise<AuthUserSummary | null> {
    const [row] = await this.database.withTenant({ userId }, (tx) =>
      tx
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          emailVerifiedAt: users.emailVerifiedAt,
          avatarUrl: users.avatarUrl,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
    );
    if (!row?.isActive) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      emailVerified: row.emailVerifiedAt !== null,
      avatarUrl: row.avatarUrl,
    };
  }

  /** Stores a new email-verification token and invalidates earlier unused ones. */
  async createVerificationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.database.withTenant({ userId }, async (tx) => {
      await tx
        .update(verificationTokens)
        .set({ consumedAt: new Date() })
        .where(
          and(
            eq(verificationTokens.userId, userId),
            eq(verificationTokens.type, 'email_verification'),
            isNull(verificationTokens.consumedAt),
          ),
        );
      await tx
        .insert(verificationTokens)
        .values({ userId, type: 'email_verification', tokenHash, expiresAt });
    });
  }

  /**
   * Issues a new verification token for an unverified account found by email. Resolves to null
   * for unknown or already verified emails.
   */
  async createVerificationTokenForEmail(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetTarget | null> {
    const { rows } = await this.database.db.execute<{
      user_id: string;
      email: string;
      name: string | null;
    }>(
      sql`SELECT * FROM app.auth_create_verification_token(${email}, ${tokenHash}, ${expiresAt.toISOString()}::timestamptz)`,
    );
    const row = rows[0];
    return row ? { userId: row.user_id, email: row.email, name: row.name } : null;
  }

  /** Atomically consumes a single-use token; returns its user id, or null if unusable. */
  async consumeToken(
    type: VerificationTokenType,
    tokenHash: string,
  ): Promise<string | null> {
    const { rows } = await this.database.db.execute<{ user_id: string | null }>(
      sql`SELECT app.auth_consume_token(${type}, ${tokenHash}) AS user_id`,
    );
    return rows[0].user_id;
  }

  /**
   * Marks the email verified and activates the account. Only accounts that were never verified
   * are touched, so an administrator-disabled (verified, inactive) account stays disabled.
   */
  async markEmailVerified(userId: string): Promise<void> {
    await this.database.withTenant({ userId }, (tx) =>
      tx
        .update(users)
        .set({ emailVerifiedAt: new Date(), isActive: true })
        .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt))),
    );
  }

  async createResetToken(
    email: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<PasswordResetTarget | null> {
    const { rows } = await this.database.db.execute<{
      user_id: string;
      email: string;
      name: string | null;
    }>(
      sql`SELECT * FROM app.auth_create_reset_token(${email}, ${tokenHash}, ${expiresAt.toISOString()}::timestamptz)`,
    );
    const row = rows[0];
    return row ? { userId: row.user_id, email: row.email, name: row.name } : null;
  }

  /** Sets a new password, marks the email verified (the reset link proved ownership) and revokes every session. */
  async resetPassword(userId: string, passwordHash: string): Promise<void> {
    await this.database.withTenant({ userId }, async (tx) => {
      await tx
        .insert(userCredentials)
        .values({ userId, passwordHash })
        .onConflictDoUpdate({
          target: userCredentials.userId,
          set: { passwordHash, passwordUpdatedAt: new Date() },
        });
      await tx
        .update(users)
        .set({ emailVerifiedAt: new Date(), isActive: true })
        .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)));
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    });
  }

  async findOAuthAccount(
    provider: OAuthProfile['provider'],
    providerAccountId: string,
  ): Promise<OAuthAccountLookup | null> {
    const { rows } = await this.database.db.execute<{
      user_id: string;
      is_active: boolean;
    }>(
      sql`SELECT * FROM app.auth_find_oauth_account(${provider}, ${providerAccountId})`,
    );
    const row = rows[0];
    return row ? { userId: row.user_id, isActive: row.is_active } : null;
  }

  /**
   * Links a provider account to an existing user. When the local account's email was never
   * verified, any password registered for it is removed and its sessions revoked, so someone
   * who pre-registered a victim's email cannot keep access after the real owner signs in.
   */
  async linkOAuthAccount(input: {
    userId: string;
    profile: OAuthProfile;
    localEmailUnverified: boolean;
  }): Promise<void> {
    const { userId, profile, localEmailUnverified } = input;
    await this.database.withTenant({ userId }, async (tx) => {
      await tx.insert(oauthAccounts).values({
        userId,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        providerEmail: profile.email,
      });
      if (localEmailUnverified) {
        await tx.delete(userCredentials).where(eq(userCredentials.userId, userId));
        await tx
          .update(users)
          .set({ emailVerifiedAt: new Date(), isActive: true })
          .where(eq(users.id, userId));
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
      }
    });
  }

  async createOAuthUser(profile: OAuthProfile): Promise<string> {
    const { rows } = await this.database.db.execute<{ id: string }>(
      sql`SELECT app.auth_create_oauth_user(${profile.email}, ${profile.name}, ${profile.avatarUrl}, ${profile.provider}, ${profile.providerAccountId}) AS id`,
    );
    return rows[0].id;
  }

  /** Password hash (if any) and linked providers of a user, read in their own tenant context. */
  async getSignInMethods(userId: string): Promise<SignInMethods> {
    return this.database.withTenant({ userId }, async (tx) => {
      const [credential] = await tx
        .select({ passwordHash: userCredentials.passwordHash })
        .from(userCredentials)
        .where(eq(userCredentials.userId, userId));
      const accounts = await tx
        .select({ provider: oauthAccounts.provider })
        .from(oauthAccounts)
        .where(eq(oauthAccounts.userId, userId));
      return {
        passwordHash: credential?.passwordHash ?? null,
        providers: accounts.map((account) => account.provider),
      };
    });
  }

  /** Sets the password (adding one for OAuth-only users) and revokes every session of the user. */
  async replacePassword(userId: string, passwordHash: string): Promise<void> {
    await this.database.withTenant({ userId }, async (tx) => {
      await tx
        .insert(userCredentials)
        .values({ userId, passwordHash })
        .onConflictDoUpdate({
          target: userCredentials.userId,
          set: { passwordHash, passwordUpdatedAt: new Date() },
        });
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    });
  }

  /**
   * Removes a linked provider, unless it is the user's only way to sign in (no password and no
   * other provider).
   */
  async unlinkOAuthAccount(
    userId: string,
    provider: OAuthProfile['provider'],
  ): Promise<UnlinkResult> {
    return this.database.withTenant({ userId }, async (tx) => {
      const [credential] = await tx
        .select({ userId: userCredentials.userId })
        .from(userCredentials)
        .where(eq(userCredentials.userId, userId));
      const accounts = await tx
        .select({ provider: oauthAccounts.provider })
        .from(oauthAccounts)
        .where(eq(oauthAccounts.userId, userId));

      if (!accounts.some((account) => account.provider === provider)) return 'not-linked';
      if (!credential && accounts.length <= 1) return 'last-sign-in-method';

      await tx
        .delete(oauthAccounts)
        .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, provider)));
      return 'unlinked';
    });
  }
}
