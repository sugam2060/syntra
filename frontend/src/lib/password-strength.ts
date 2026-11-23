import type { PasswordStrengthScore } from "@/types/register";

/** Scores a password for the strength meter. It is a hint only: the gateway enforces length. */
export function getPasswordStrength(value: string): PasswordStrengthScore {
  let score = 0;
  if (value.length >= 4) score += 1;
  if (value.length >= 10) score += 1;
  if (/[A-Z]/.test(value) && /[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value) && value.length >= 12) score += 1;
  return score as PasswordStrengthScore;
}
