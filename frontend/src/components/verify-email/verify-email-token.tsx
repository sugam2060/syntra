import { VerifyEmailFlow } from "@/components/verify-email/verify-email-flow";

type VerifyEmailTokenProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** Reads `?token=` on the server (it is request-time data, so the caller wraps this in Suspense) and hands it to the client flow. */
export async function VerifyEmailToken({ searchParams }: VerifyEmailTokenProps) {
  const { token } = await searchParams;
  return <VerifyEmailFlow token={typeof token === "string" ? token : null} />;
}
