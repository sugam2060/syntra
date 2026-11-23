/** The user attached to `request.user` after the JWT guard succeeds. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  emailVerified: boolean;
}
