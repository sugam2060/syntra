import { LegalDialog } from "@/components/shared/legal-dialog";
import { PRIVACY_SECTIONS } from "@/lib/legal-content";

type PrivacyPolicyDialogProps = {
  /** The trigger's label. Defaults to "Privacy Policy". */
  children?: React.ReactNode;
  triggerClassName?: string;
};

/** Privacy Policy in a full-screen dialog. The children are the clickable label. */
export function PrivacyPolicyDialog({
  children = "Privacy Policy",
  triggerClassName,
}: PrivacyPolicyDialogProps) {
  return (
    <LegalDialog
      title="Privacy Policy"
      sections={PRIVACY_SECTIONS}
      triggerClassName={triggerClassName}
    >
      {children}
    </LegalDialog>
  );
}
