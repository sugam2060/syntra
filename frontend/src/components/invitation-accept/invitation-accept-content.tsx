import { InvitationAcceptFlow } from "@/components/invitation-accept/invitation-accept-flow";

type InvitationAcceptContentProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** Reads `?token=` on the server (request-time data, so the caller wraps this in Suspense) and hands it to the client flow. */
export async function InvitationAcceptContent({
  searchParams,
}: InvitationAcceptContentProps) {
  const { token } = await searchParams;
  return <InvitationAcceptFlow token={typeof token === "string" ? token : null} />;
}
