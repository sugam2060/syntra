"use client";

import { useState } from "react";
import { LuX } from "react-icons/lu";

import { AuthFieldError } from "@/components/shared/auth-field-error";
import { AuthInput } from "@/components/shared/auth-input";
import { EMAIL_MAX_LENGTH, emailSchema, INVITE_MAX_EMAILS } from "@/types/schema";

// Addresses are separated by commas, semicolons or whitespace (so a pasted list works).
const SEPARATOR = /[,;\s]+/;
const TRAILING_SEPARATOR = /[,;\s]$/;

type EmailChipInputProps = {
  id: string;
  emails: string[];
  onChange: (emails: string[]) => void;
  disabled: boolean;
  invalid: boolean;
};

/**
 * Text input that turns addresses into removable chips on comma, Enter, blur or paste.
 * Addresses that are not valid stay in the box with a message instead of being dropped.
 */
export function EmailChipInput({
  id,
  emails,
  onChange,
  disabled,
  invalid,
}: EmailChipInputProps) {
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  function commit(raw: string): void {
    const tokens = raw.split(SEPARATOR).filter(Boolean);
    if (tokens.length === 0) {
      setDraft("");
      return;
    }

    const next = [...emails];
    const rejected: string[] = [];
    let overflow = false;

    for (const token of tokens) {
      const parsed = emailSchema.safeParse(token);
      if (!parsed.success) {
        rejected.push(token);
        continue;
      }
      const email = parsed.data.toLowerCase();
      if (next.includes(email)) {
        continue;
      }
      if (next.length >= INVITE_MAX_EMAILS) {
        overflow = true;
        continue;
      }
      next.push(email);
    }

    onChange(next);
    setDraft(rejected.join(", "));
    if (rejected.length > 0) {
      setDraftError(
        rejected.length === 1
          ? `${rejected[0]} isn't a valid email address.`
          : "Some of those aren't valid email addresses.",
      );
    } else if (overflow) {
      setDraftError(`You can invite up to ${INVITE_MAX_EMAILS} people at a time.`);
    } else {
      setDraftError(null);
    }
  }

  function remove(email: string): void {
    onChange(emails.filter((existing) => existing !== email));
  }

  return (
    <div className="flex flex-col gap-2">
      <AuthInput
        id={id}
        type="text"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={EMAIL_MAX_LENGTH * 2}
        placeholder="Add emails separated by commas"
        value={draft}
        disabled={disabled}
        aria-invalid={invalid || draftError !== null}
        onChange={(event) => {
          const value = event.target.value;
          if (TRAILING_SEPARATOR.test(value)) {
            commit(value);
          } else {
            setDraft(value);
            setDraftError(null);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          } else if (event.key === "Backspace" && draft === "" && emails.length > 0) {
            remove(emails[emails.length - 1]);
          }
        }}
        onBlur={() => commit(draft)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (SEPARATOR.test(pasted.trim())) {
            event.preventDefault();
            commit(`${draft} ${pasted}`);
          }
        }}
      />

      {draftError && <AuthFieldError>{draftError}</AuthFieldError>}

      {emails.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2 pt-1" aria-label="People to invite">
          {emails.map((email) => (
            <li
              key={email}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pr-1.5 pl-3 text-xs leading-[18px] text-foreground"
            >
              {email}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${email}`}
                onClick={() => remove(email)}
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <LuX className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
