export const START_OPTION = {
  create: "create",
  join: "join",
} as const;

export type StartOption = (typeof START_OPTION)[keyof typeof START_OPTION];
