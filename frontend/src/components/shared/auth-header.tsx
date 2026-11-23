import { SyntraLogo } from "@/components/shared/syntra-logo";

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <>
      <SyntraLogo />
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] leading-[30px] font-semibold tracking-[-0.3px] text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-[21px] text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </>
  );
}
