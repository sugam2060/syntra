export type OAuthProvider = 'google' | 'github';

/** Provider profile normalised by the strategy before it reaches the service. */
export interface OAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  avatarUrl: string | null;
}
