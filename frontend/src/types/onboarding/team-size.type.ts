export const TEAM_SIZE = {
  justMe: "just-me",
  small: "2-5",
  medium: "6-15",
} as const;

export type TeamSize = (typeof TEAM_SIZE)[keyof typeof TEAM_SIZE];

export const TEAM_SIZE_OPTIONS: ReadonlyArray<{ value: TeamSize; label: string }> = [
  { value: TEAM_SIZE.justMe, label: "Just me" },
  { value: TEAM_SIZE.small, label: "2–5" },
  { value: TEAM_SIZE.medium, label: "6–15" },
];
