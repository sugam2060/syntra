import type { IconType } from "react-icons";
import { LuCircleAlert, LuClock, LuMail } from "react-icons/lu";

import { cn } from "@/lib/utils";
import { AUTH_BANNER_VARIANT, type AuthBannerVariant } from "@/types/shared";

type AuthBannerProps = {
  variant: AuthBannerVariant;
  children: React.ReactNode;
  /** Optional action rendered under the message (for example "Resend email"). */
  action?: React.ReactNode;
};

const VARIANT_STYLES: Record<
  AuthBannerVariant,
  { icon: IconType; container: string; iconColor: string }
> = {
  [AUTH_BANNER_VARIANT.info]: {
    icon: LuMail,
    container: "border-info/30 bg-info/10",
    iconColor: "text-info",
  },
  [AUTH_BANNER_VARIANT.warning]: {
    icon: LuClock,
    container: "border-warning/30 bg-warning/10",
    iconColor: "text-warning",
  },
  [AUTH_BANNER_VARIANT.danger]: {
    icon: LuCircleAlert,
    container: "border-destructive/30 bg-destructive/10",
    iconColor: "text-destructive",
  },
};

export function AuthBanner({ variant, children, action }: AuthBannerProps) {
  const { icon: Icon, container, iconColor } = VARIANT_STYLES[variant];

  return (
    <div
      role={variant === AUTH_BANNER_VARIANT.info ? "status" : "alert"}
      className={cn(
        "flex items-start gap-3 rounded-card border p-3 text-foreground",
        container,
      )}
    >
      <Icon className={cn("mt-px size-[18px] shrink-0", iconColor)} aria-hidden="true" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-xs leading-[18px]">{children}</p>
        {action}
      </div>
    </div>
  );
}
