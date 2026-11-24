import { LuFolderKanban } from "react-icons/lu";

/** Says plainly that projects are not available yet. No button: there is nothing to do here. */
export function ProjectsEmptyCard() {
  return (
    <section
      aria-labelledby="projects-soon-heading"
      className="flex flex-col items-center gap-3 rounded-[10px] border border-dashed border-border px-6 py-10 text-center"
    >
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-accent text-primary"
      >
        <LuFolderKanban className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h2
          id="projects-soon-heading"
          className="text-[15px] leading-[22px] font-semibold text-foreground"
        >
          Projects are coming soon
        </h2>
        <p className="max-w-[44ch] text-sm leading-[21px] text-muted-foreground">
          Boards, tasks and AI help will show up here as soon as they are ready.
        </p>
      </div>
    </section>
  );
}
