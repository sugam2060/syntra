"use client";

import { useState } from "react";

import { INVITE_ROLE_OPTIONS } from "@/lib/invite-roles";
import { describeExpiry } from "@/lib/invitation-expiry";
import { cn } from "@/lib/utils";
import type { InvitationPreview } from "@/types/shared";

type InvitationDetailsProps = {
  preview: InvitationPreview;
};

function describeRole(roleName: string): string | undefined {
  const normalized = roleName.trim().toLowerCase();
  return INVITE_ROLE_OPTIONS.find((option) => option.label.toLowerCase() === normalized)
    ?.description;
}

type DetailRowProps = {
  label: string;
  children: React.ReactNode;
};

function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 py-3">
      <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 break-words text-foreground">
        {children}
      </dd>
    </div>
  );
}

/** The quiet panel under the headline: workspace, the role being granted, who invited, and when the link stops working. */
export function InvitationDetails({ preview }: InvitationDetailsProps) {
  const [now] = useState(() => Date.now());
  const expiry = describeExpiry(preview.expiresAt, now);
  const roleDescription = describeRole(preview.roleName);

  return (
    <dl className="flex flex-col divide-y divide-border rounded-card border bg-surface px-4">
      <DetailRow label="Workspace">
        <span className="font-medium">{preview.workspaceName}</span>
      </DetailRow>
      <DetailRow label="Your role">
        <span className="font-medium">{preview.roleName}</span>
        {roleDescription !== undefined && (
          <span className="mt-0.5 block text-xs leading-[18px] text-muted-foreground">
            {roleDescription}
          </span>
        )}
      </DetailRow>
      {preview.inviterName !== null && (
        <DetailRow label="Invited by">{preview.inviterName}</DetailRow>
      )}
      <DetailRow label="Expires">
        <time
          dateTime={preview.expiresAt}
          className={cn(expiry.urgent && "font-medium text-warning")}
        >
          {expiry.label}
        </time>
      </DetailRow>
    </dl>
  );
}
