import type { Metadata } from "next";

import { EntryRedirect } from "@/components/entry/entry-redirect";

export const metadata: Metadata = {
  title: "Syntra",
  robots: { index: false, follow: false },
};

export default function Home() {
  return <EntryRedirect />;
}
