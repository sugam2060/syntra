import { TopBar } from "@/components/shared/top-bar";
import { UserMenu } from "@/components/shared/user-menu";

type StatusScreenProps = {
  children: React.ReactNode;
};

/** Full-screen frame for a page that cannot show the shell (workspace missing, failed to load): slim top bar, message centered. */
export function StatusScreen({ children }: StatusScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar end={<UserMenu />} />
      <main className="flex flex-1 items-center justify-center p-6 lg:p-12">{children}</main>
    </div>
  );
}
