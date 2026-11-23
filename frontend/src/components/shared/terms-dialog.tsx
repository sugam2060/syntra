import { LegalDialog } from "@/components/shared/legal-dialog";
import { TERMS_SECTIONS } from "@/lib/legal-content";

type TermsDialogProps = {
  /** The trigger's label. Defaults to "Terms". */
  children?: React.ReactNode;
  triggerClassName?: string;
};

/** Terms of Service in a full-screen dialog. The children are the clickable label. */
export function TermsDialog({
  children = "Terms",
  triggerClassName,
}: TermsDialogProps) {
  return (
    <LegalDialog
      title="Terms of Service"
      sections={TERMS_SECTIONS}
      triggerClassName={triggerClassName}
    >
      {children}
    </LegalDialog>
  );
}
