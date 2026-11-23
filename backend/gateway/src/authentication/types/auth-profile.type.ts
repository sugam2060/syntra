import type { OAuthProvider } from './oauth-profile.type';
import type { AuthUserSummary } from './auth-user.type';

/** What `GET /authentication/me` returns: the user plus how they can sign in. */
export interface AuthProfile extends AuthUserSummary {
  hasPassword: boolean;
  /** Linked social accounts, e.g. `['google']`. */
  providers: OAuthProvider[];
}

/** Sign-in methods of a user, read in their own tenant context. */
export interface SignInMethods {
  passwordHash: string | null;
  providers: OAuthProvider[];
}

/** Outcome of unlinking a provider; the service maps the failures to 404 and 409. */
export type UnlinkResult = 'unlinked' | 'not-linked' | 'last-sign-in-method';

/** Body of `POST /authentication/google/link`: where the browser must go next. */
export interface LinkGoogleResponse {
  url: string;
}
