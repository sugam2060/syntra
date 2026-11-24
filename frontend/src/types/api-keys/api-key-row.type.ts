import type { ApiKeySummary } from "@/types/shared";

import type { ApiKeyStatus } from "./api-key-status.type";
import type { ExpiryDescription } from "./expiry-description.type";
import type { KeyCreator } from "./key-creator.type";

/** One key with everything the table and the mobile cards show, worked out once. */
export type ApiKeyRow = {
  key: ApiKeySummary;
  status: ApiKeyStatus;
  expiry: ExpiryDescription;
  createdLabel: string;
  lastUsedLabel: string;
  neverUsed: boolean;
  creator: KeyCreator;
};
