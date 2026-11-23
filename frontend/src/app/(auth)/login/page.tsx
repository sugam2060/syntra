import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginForm } from "@/components/login/login-form";
import { LoginFormSkeleton } from "@/components/login/login-form-skeleton";
import { AuthHeader } from "@/components/shared/auth-header";
import { AuthLegal } from "@/components/shared/auth-legal";
import { AuthShell } from "@/components/shared/auth-shell";

export const metadata: Metadata = {
  title: "Sign in — Syntra",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <AuthHeader title="Welcome back" subtitle="Sign in to your workspace" />
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
      <AuthLegal />
    </AuthShell>
  );
}
