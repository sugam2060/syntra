import { SyntraLogo } from "@/components/shared/syntra-logo";

type VerifyEmailCardProps = {
  /** The 56px status circle on top. */
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Actions or forms under the message. */
  children?: React.ReactNode;
};

/** Shared frame of every verify-email state: logo, status icon, H1, supporting line and actions. */
export function VerifyEmailCard({
  icon,
  title,
  description,
  children,
}: VerifyEmailCardProps) {
  return (
    <>
      <div className="flex justify-center">
        <SyntraLogo />
      </div>
      <div className="flex flex-col items-center gap-4 text-center">
        {icon}
        <div className="flex flex-col gap-2">
          <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
            {title}
          </h1>
          {description !== undefined && (
            <p className="text-sm leading-[21px] text-pretty text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </>
  );
}
