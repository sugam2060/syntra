import { SetMetadata } from '@nestjs/common';

/** Metadata key read by `ApiKeyGuard`. */
export const NO_API_KEY = 'noApiKey';

/**
 * Marks a route (or controller) as reserved for signed-in users: a request authenticated with
 * an API key gets 403. Use it for anything that manages identity or credentials (sign-in,
 * passwords, creating API keys) so a leaked key cannot escalate itself.
 */
export const NoApiKey = () => SetMetadata(NO_API_KEY, true);
