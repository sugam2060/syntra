import { PrivacyPolicyDialog } from "@/components/shared/privacy-policy-dialog";
import { TermsDialog } from "@/components/shared/terms-dialog";

export function AuthLegal() {
  return (
    <p className="text-center text-xs leading-[18px] text-pretty text-muted-foreground">
      By continuing you agree to the <TermsDialog /> and{" "}
      <PrivacyPolicyDialog />.
    </p>
  );
}
