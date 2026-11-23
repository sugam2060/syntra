import Image from "next/image";

// The mark's viewBox is 384x319, so height 36 gives a width of about 43.
const MARK_WIDTH = 43;
const MARK_HEIGHT = 36;

export function SyntraLogo() {
  return (
    <div className="flex items-center gap-1">
      <Image
        src="/brand/syntra-mark-light.svg"
        alt=""
        width={MARK_WIDTH}
        height={MARK_HEIGHT}
        aria-hidden="true"
        className="dark:hidden"
      />
      <Image
        src="/brand/syntra-mark-dark.svg"
        alt=""
        width={MARK_WIDTH}
        height={MARK_HEIGHT}
        aria-hidden="true"
        className="hidden dark:block"
      />
      <span className="text-lg leading-[26px] font-semibold tracking-[-0.2px] text-foreground">
        syntra
      </span>
    </div>
  );
}
