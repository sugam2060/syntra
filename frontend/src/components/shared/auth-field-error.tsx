import { LuCircleAlert } from "react-icons/lu";

import { FieldError } from "@/components/ui/field";

export function AuthFieldError({ children }: { children: React.ReactNode }) {
  return (
    <FieldError className="flex items-start gap-1 text-xs leading-[18px]">
      <LuCircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </FieldError>
  );
}
