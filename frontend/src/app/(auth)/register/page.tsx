import type { Metadata } from "next";

import { RegisterFlow } from "@/components/register/register-flow";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Create account — Syntra",
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterFlow />
    </AuthShell>
  );
}
