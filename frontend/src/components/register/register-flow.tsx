"use client";

import { useState } from "react";

import { RegisterForm } from "@/components/register/register-form";
import { RegisterSuccess } from "@/components/register/register-success";
import { AuthHeader } from "@/components/shared/auth-header";
import { AuthLegal } from "@/components/shared/auth-legal";

/** Switches between the form and the "check your email" state. Starting over remounts the form, so it comes back empty. */
export function RegisterFlow() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (sentTo !== null) {
    return (
      <RegisterSuccess email={sentTo} onStartOver={() => setSentTo(null)} />
    );
  }

  return (
    <>
      <AuthHeader
        title="Create your account"
        subtitle="Free for teams up to 15 people"
      />
      <RegisterForm onRegistered={setSentTo} />
      <AuthLegal />
    </>
  );
}
