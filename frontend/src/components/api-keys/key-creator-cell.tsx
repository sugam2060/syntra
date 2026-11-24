import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/lib/user-display";
import type { KeyCreator } from "@/types/api-keys";

/** A 24px avatar and the name of the person the key acts for. */
export function KeyCreatorCell({ creator }: { creator: KeyCreator }) {
  if (creator.kind === "loading") {
    return (
      <span className="flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-3.5 w-20" />
      </span>
    );
  }
  if (creator.kind === "unknown") {
    return <span className="text-sm text-muted-foreground">Unknown member</span>;
  }
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        {creator.avatarUrl && <AvatarImage src={creator.avatarUrl} alt="" />}
        <AvatarFallback aria-hidden="true">
          {getInitials({ name: creator.name, email: creator.email })}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm text-foreground">{creator.name}</span>
    </span>
  );
}
