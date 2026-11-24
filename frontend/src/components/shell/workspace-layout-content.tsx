import { WorkspaceProvider } from "@/providers/workspace-provider";

type WorkspaceLayoutContentProps = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

/** Reads the `[slug]` segment on the server and hands it to the workspace provider. Render inside Suspense. */
export async function WorkspaceLayoutContent({ params, children }: WorkspaceLayoutContentProps) {
  const { slug } = await params;
  return <WorkspaceProvider slug={slug}>{children}</WorkspaceProvider>;
}
