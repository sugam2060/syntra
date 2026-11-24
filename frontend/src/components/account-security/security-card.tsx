import { useId } from "react";

import { Card } from "@/components/ui/card";

type SecurityCardProps = {
  title: string;
  children: React.ReactNode;
};

/** One section of the security page: a 10px card with a small heading and its rows. */
export function SecurityCard({ title, children }: SecurityCardProps) {
  const headingId = useId();

  return (
    <Card
      role="group"
      aria-labelledby={headingId}
      className="gap-3 rounded-card border border-border py-4 shadow-none ring-0"
    >
      <h2
        id={headingId}
        className="px-4 text-sm leading-5 font-semibold text-foreground"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3 px-4">{children}</div>
    </Card>
  );
}
