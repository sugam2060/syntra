import { CopyPrefixButton } from "@/components/api-keys/copy-prefix-button";

type KeyPrefixProps = {
  keyPrefix: string;
  keyName: string;
};

/** The recognisable start of a key in Geist Mono, with an ellipsis (the rest is never shown) and a copy button. */
export function KeyPrefix({ keyPrefix, keyName }: KeyPrefixProps) {
  return (
    <span className="flex items-center gap-1">
      <code className="font-mono text-[13px] text-foreground">{keyPrefix}…</code>
      <CopyPrefixButton keyPrefix={keyPrefix} keyName={keyName} />
    </span>
  );
}
