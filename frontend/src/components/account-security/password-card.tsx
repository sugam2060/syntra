"use client";

import { useState } from "react";
import { LuLock } from "react-icons/lu";

import { ChangePasswordDialog } from "@/components/account-security/change-password-dialog";
import { SecurityCard } from "@/components/account-security/security-card";
import { SecurityRow } from "@/components/account-security/security-row";
import { Button } from "@/components/ui/button";

type PasswordCardProps = {
  hasPassword: boolean;
};

export function PasswordCard({ hasPassword }: PasswordCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <SecurityCard title="Password">
      <SecurityRow
        icon={<LuLock />}
        title={hasPassword ? "Password set" : "No password set"}
        description={
          hasPassword
            ? "Use at least 10 characters."
            : "Add one to also sign in with email."
        }
        action={
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setOpen(true)}
            className="h-10 px-4 sm:h-9"
          >
            {hasPassword ? "Change password" : "Add password"}
          </Button>
        }
      />
      <ChangePasswordDialog
        open={open}
        onOpenChange={setOpen}
        hasPassword={hasPassword}
      />
    </SecurityCard>
  );
}
