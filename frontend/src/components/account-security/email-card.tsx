import { LuCircleCheck, LuClock, LuMail } from "react-icons/lu";

import { SecurityCard } from "@/components/account-security/security-card";
import { SecurityRow } from "@/components/account-security/security-row";
import { Badge } from "@/components/ui/badge";

type EmailCardProps = {
  email: string;
  verified: boolean;
};

export function EmailCard({ email, verified }: EmailCardProps) {
  return (
    <SecurityCard title="Email">
      <SecurityRow
        icon={<LuMail />}
        title={email}
        action={
          verified ? (
            <Badge className="bg-success/10 text-success">
              <LuCircleCheck aria-hidden="true" />
              Verified
            </Badge>
          ) : (
            <Badge className="bg-warning/10 text-warning">
              <LuClock aria-hidden="true" />
              Not verified
            </Badge>
          )
        }
      />
    </SecurityCard>
  );
}
