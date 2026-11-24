import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { PreviewMember } from "@/types/onboarding";

const AVATAR_TONES = [
  "bg-accent text-primary",
  "bg-info/10 text-foreground",
  "bg-success/10 text-foreground",
] as const;

const MAX_AVATARS = 4;

type BoardPreviewCardProps = {
  workspaceName: string;
  /** Everyone who will be in the workspace, the current user first. */
  members: PreviewMember[];
};

type PreviewTask = { key: number; title: string };

const TODO_TASKS: PreviewTask[] = [
  { key: 1, title: "Define Q1 roadmap" },
  { key: 2, title: "Set up CI pipeline" },
];
const IN_PROGRESS_TASKS: PreviewTask[] = [{ key: 3, title: "Design onboarding" }];

function taskPrefix(workspaceName: string): string {
  return workspaceName.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() || "TSK";
}

type PreviewColumnProps = {
  label: string;
  dotClassName: string;
  prefix: string;
  tasks: PreviewTask[];
};

function PreviewColumn({ label, dotClassName, prefix, tasks }: PreviewColumnProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <span className={cn("size-2 rounded-full", dotClassName)} aria-hidden="true" />
        <span className="text-xs leading-4 font-medium text-muted-foreground">
          {label}
        </span>
      </div>
      {tasks.map((task) => (
        <div
          key={task.key}
          className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3"
        >
          <span className="font-mono text-[13px] leading-5 text-muted-foreground">
            {prefix}-{task.key}
          </span>
          <span className="text-xs leading-4 font-medium text-foreground">
            {task.title}
          </span>
        </div>
      ))}
    </div>
  );
}

/** A muted sketch of a project board, as a preview of what the workspace will look like. Sample content only. */
export function BoardPreviewCard({
  workspaceName,
  members,
}: BoardPreviewCardProps) {
  const prefix = taskPrefix(workspaceName);
  const shown = members.slice(0, MAX_AVATARS);
  const hidden = members.length - shown.length;

  return (
    <aside
      aria-label="Board preview"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[15px] leading-[22px] font-semibold text-foreground">
          {workspaceName} · Board
        </span>
        <span className="font-mono text-[13px] leading-5 text-muted-foreground">
          Preview
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PreviewColumn
          label="Todo"
          dotClassName="bg-muted-foreground"
          prefix={prefix}
          tasks={TODO_TASKS}
        />
        <PreviewColumn
          label="In Progress"
          dotClassName="bg-info"
          prefix={prefix}
          tasks={IN_PROGRESS_TASKS}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs leading-[18px] text-muted-foreground">
          {members.length} {members.length === 1 ? "member" : "members"} ready
        </span>
        <div className="flex items-center gap-1">
          {shown.map(({ initials, avatarUrl }, index) => (
            <Avatar key={`${initials}-${index}`} size="sm">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
              <AvatarFallback
                className={cn(
                  "text-[10px] font-medium",
                  AVATAR_TONES[index % AVATAR_TONES.length],
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          ))}
          {hidden > 0 && (
            <Avatar size="sm">
              <AvatarFallback className="bg-muted text-[10px] text-muted-foreground">
                +{hidden}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </aside>
  );
}
