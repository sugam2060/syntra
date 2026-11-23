"use client";

import { useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";

import { AuthInput } from "@/components/shared/auth-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof AuthInput>, "type">;

export function PasswordInput({ className, disabled, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? LuEyeOff : LuEye;

  return (
    <div className="relative flex items-center">
      <AuthInput
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        className={cn("pr-10", className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute top-1/2 right-0.5 size-9 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
      >
        <Icon className="size-[18px]" aria-hidden="true" />
      </Button>
    </div>
  );
}
