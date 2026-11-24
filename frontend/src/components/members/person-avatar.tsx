import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/user-display";

type PersonAvatarProps = {
  name: string | null;
  email?: string;
  avatarUrl?: string | null;
  /** 32px by default, 24px for dense rows. */
  size?: "default" | "sm";
  className?: string;
};

/** Round avatar with initials as the fallback. */
export function PersonAvatar({
  name,
  email = "",
  avatarUrl = null,
  size = "default",
  className,
}: PersonAvatarProps) {
  const initials = getInitials({ name, email }) || "?";
  return (
    <Avatar size={size} className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
      <AvatarFallback
        className={cn("bg-accent font-medium text-primary", size === "sm" ? "text-[10px]" : "text-xs")}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
