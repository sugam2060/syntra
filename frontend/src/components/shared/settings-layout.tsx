import { cn } from "@/lib/utils";

type SettingsLayoutProps = {
  /** Tailwind max-width for the content column, for example `max-w-[1040px]`. Defaults to the full width of the page. */
  contentClassName?: string;
  children: React.ReactNode;
};

/** The settings pages' frame: one content column. Other pages are reached from the sidebar. */
export function SettingsLayout({
  contentClassName = "w-full",
  children,
}: SettingsLayoutProps) {
  return <div className={cn("flex min-w-0 flex-col gap-6", contentClassName)}>{children}</div>;
}
