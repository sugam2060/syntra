"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LEGAL_LAST_UPDATED } from "@/lib/legal-content";
import { cn } from "@/lib/utils";
import type { LegalSection } from "@/types/shared";

type LegalDialogProps = {
  title: string;
  sections: readonly LegalSection[];
  /** The trigger's label, for example "Terms". */
  children: React.ReactNode;
  /** Extra classes for the trigger. By default it looks like an underlined inline link. */
  triggerClassName?: string;
};

/**
 * A legal document in a dialog that covers the whole screen with a 16px margin on every side.
 * The header and footer stay put while the text scrolls. Use `TermsDialog` or `PrivacyPolicyDialog`.
 */
export function LegalDialog({
  title,
  sections,
  children,
  triggerClassName,
}: LegalDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "cursor-pointer underline hover:text-foreground",
          triggerClassName,
        )}
      >
        {children}
      </DialogTrigger>
      <DialogContent className="inset-4 flex h-auto w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-card p-0 sm:max-w-none">
        <DialogHeader className="gap-1 border-b px-6 py-4 pr-14">
          <DialogTitle className="text-lg leading-[26px] font-semibold tracking-[-0.2px]">
            {title}
          </DialogTitle>
          <DialogDescription>Last updated {LEGAL_LAST_UPDATED}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-8">
          <article className="mx-auto flex max-w-3xl flex-col gap-8">
            {sections.map((section) => (
              <section key={section.id} className="flex flex-col gap-3">
                <h2 className="text-base leading-6 font-semibold text-foreground">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-[22px] text-pretty text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-[22px] text-muted-foreground marker:text-border">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="text-pretty">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>
        </div>

        <DialogFooter showCloseButton className="m-0 px-6 py-4" />
      </DialogContent>
    </Dialog>
  );
}
