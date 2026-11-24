import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

/** The shell while the workspace loads: sidebar, top bar and a page header with a row of cards, all as placeholders. */
export function ShellSkeleton() {
  return (
    <SidebarProvider
      role="status"
      aria-label="Loading workspace"
      className="h-dvh min-h-0 overflow-hidden bg-background"
    >
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2.5 p-1.5">
            <Skeleton className="size-8 shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu className="gap-1.5">
            {Array.from({ length: 5 }, (_, index) => (
              <SidebarMenuItem key={index}>
                <Skeleton className="h-8 w-full" />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 p-1.5">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 overflow-hidden">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
          <Skeleton className="size-8 md:hidden" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex max-w-[1200px] flex-col gap-6 px-4 py-6 sm:px-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-[30px] w-72 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-[10px]" />
            ))}
          </div>
          <Skeleton className="h-[120px] rounded-[10px]" />
        </div>
      </SidebarInset>
      <span className="sr-only">Loading workspace</span>
    </SidebarProvider>
  );
}
