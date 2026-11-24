type NamedPerson = {
  name: string | null;
  email: string;
};

/** Up to two initials for an avatar fallback: from the name when there is one, else from the email. */
export function getInitials({ name, email }: NamedPerson): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
  }
  const source = words[0] ?? email;
  return source.slice(0, 2).toUpperCase();
}

/** The name to greet someone with: the first word of their name, or null when they have none. */
export function getFirstName(name: string | null): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? first : null;
}
