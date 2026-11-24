import { AuthBanner } from "@/components/shared/auth-banner";
import { MAX_ACTIVE_API_KEYS } from "@/lib/api-key-status";
import { AUTH_BANNER_VARIANT } from "@/types/shared";
import type { CreateApiKeyError } from "@/types/api-keys";

/**
 * The create failures that are about the whole request. A 403 is shown next to the permissions
 * instead, so it never appears here.
 */
export function CreateKeyErrorBanner({ error }: { error: CreateApiKeyError }) {
  switch (error.kind) {
    case "limit-reached":
      return (
        <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>
          {`This workspace already has ${MAX_ACTIVE_API_KEYS} active keys. Revoke one to create another.`}
        </AuthBanner>
      );
    case "rate-limited":
      return (
        <AuthBanner variant={AUTH_BANNER_VARIANT.warning}>
          Too many attempts. Try again in a minute.
        </AuthBanner>
      );
    case "error":
      return <AuthBanner variant={AUTH_BANNER_VARIANT.danger}>{error.message}</AuthBanner>;
    case "forbidden":
      return null;
  }
}
