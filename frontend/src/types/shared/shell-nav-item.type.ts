import type { IconType } from "react-icons";

/** One entry of the sidebar navigation. `soon` entries are shown greyed out and cannot be opened. */
export type ShellNavItem = {
  key: string;
  label: string;
  href: string;
  icon: IconType;
  soon?: boolean;
};
