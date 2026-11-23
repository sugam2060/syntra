import Link from "next/link";

type AuthFooterProps = {
  prompt: string;
  linkLabel: string;
  href: string;
  /** Greys out the link while a request is in flight. */
  disabled: boolean;
};

export function AuthFooter({ prompt, linkLabel, href, disabled }: AuthFooterProps) {
  return (
    <p className="text-center text-sm leading-[21px] text-muted-foreground">
      {prompt}{" "}
      {disabled ? (
        <span className="font-medium">{linkLabel}</span>
      ) : (
        <Link href={href} className="font-medium text-primary hover:underline">
          {linkLabel}
        </Link>
      )}
    </p>
  );
}
