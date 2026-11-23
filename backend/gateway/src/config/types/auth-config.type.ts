export interface AuthConfig {
  jwt: {
    accessSecret: string;
    accessTtl: string;
    issuer: string;
    audience: string;
  };
  refreshTokenTtlDays: number;
  emailVerificationTtlHours: number;
  passwordResetTtlMinutes: number;
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
}
