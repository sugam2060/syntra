/** What went wrong when creating a key, in the terms the dialog shows. */
export type CreateApiKeyError =
  | { kind: "forbidden" }
  | { kind: "limit-reached" }
  | { kind: "rate-limited" }
  | { kind: "error"; message: string };
