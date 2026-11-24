import { Fragment } from "react";
import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { BreadcrumbTrailItem } from "@/types/shared";

type ShellTopBarProps = {
  breadcrumb: readonly BreadcrumbTrailItem[];
};

/**
 * The 56px bar above the page: the sidebar toggle (a drawer button on small screens) and the
 * breadcrumb. The last item is the current page; earlier items link when they have an `href`.
 */
export function ShellTopBar({ breadcrumb }: ShellTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-6">
      <SidebarTrigger className="-ml-1 size-10 shrink-0 md:size-8" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap gap-1.5">
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <Fragment key={`${index}-${item.label}`}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem className={cn("min-w-0", !isLast && "max-w-[10rem] shrink")}>
                  {isLast ? (
                    <BreadcrumbPage className="truncate font-medium">{item.label}</BreadcrumbPage>
                  ) : item.href ? (
                    <BreadcrumbLink render={<Link href={item.href} />} className="truncate">
                      {item.label}
                    </BreadcrumbLink>
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
