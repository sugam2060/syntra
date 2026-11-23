/** Public shape of a user returned to clients. */
export interface AuthUserSummary {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
}

/** Row returned by `app.auth_find_user_by_email`. */
export interface LoginLookupRow {
  id: string;
  email: string;
  name: string | null;
  emailVerifiedAt: Date | null;
  isActive: boolean;
  /** Null for OAuth-only accounts. */
  passwordHash: string | null;
}

/** Row returned by `app.auth_find_oauth_account`. */
export interface OAuthAccountLookup {
  userId: string;
  isActive: boolean;
}

/** Row returned by `app.auth_create_reset_token`. */
export interface PasswordResetTarget {
  userId: string;
  email: string;
  name: string | null;
}
