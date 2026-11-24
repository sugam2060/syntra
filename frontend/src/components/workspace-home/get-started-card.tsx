import Link from "next/link";
import type { IconType } from "react-icons";
import { LuChevronRight } from "react-icons/lu";

type GetStartedCardProps = {
  href: string;
  icon: IconType;
  title: string;
  description: string;
};

/** A card that links to one setup step. The whole card is the link. */
export function GetStartedCard({ href, icon: Icon, title, description }: GetStartedCardProps) {
  return (
    <Link
      href={href}
      className="group flex h-full items-start gap-3 rounded-[10px] border border-border bg-surface p-4 outline-none transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-primary"
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-5 font-medium text-foreground">{title}</span>
        <span className="text-sm leading-[21px] text-muted-foreground">{description}</span>
      </span>
      <LuChevronRight
        aria-hidden="true"
        className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </Link>
  );
}
