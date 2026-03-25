import { MaterialStrip } from "./MaterialItem";
import type { MaterialStripData } from "./MaterialItem";

export interface EdlGroupData {
  index: number | string;
  title: string;
  timecode?: string;
  state?: "default" | "selected" | "pending";
  strips: MaterialStripData[];
}

interface EdlGroupProps extends EdlGroupData {
  className?: string;
}

export function EdlGroup({
  index,
  title,
  timecode,
  state = "default",
  strips,
  className = "",
}: EdlGroupProps) {
  const isPending  = state === "pending";
  const isSelected = state === "selected";

  return (
    <div
      className={[
        "rounded-md overflow-hidden transition-shadow",
        isPending
          ? "border border-dashed border-bone-200"
          : isSelected
          ? "border border-accent shadow-[0_0_0_2px_var(--color-accent-subtle)]"
          : "border border-border hover:shadow-[0_2px_8px_rgba(30,51,64,0.06)]",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div
        className={[
          "flex items-center justify-between px-3 py-2",
          !isPending && "bg-surface-2 border-b border-border",
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <span
            className={[
              "w-6 h-6 rounded flex items-center justify-center text-[11px] font-mono font-medium flex-shrink-0",
              isSelected ? "bg-accent text-white" : "bg-bone-25 text-text-secondary",
            ].join(" ")}
          >
            {String(index).padStart(2, "0")}
          </span>
          <span className={["text-xs font-medium", isPending ? "text-text-muted" : "text-text"].join(" ")}>
            {title}
          </span>
        </div>
        {timecode && (
          <span className="text-[10px] font-mono text-text-muted">{timecode}</span>
        )}
      </div>

      {/* Body */}
      <div className="p-2 flex flex-col gap-1">
        {isPending ? (
          <div className="py-2 text-center text-[11px] text-text-muted">
            Drop material or use voice command
          </div>
        ) : (
          strips.map((strip) => <MaterialStrip key={strip.name} {...strip} />)
        )}
      </div>
    </div>
  );
}

interface EdlListProps {
  groups: EdlGroupData[];
  className?: string;
}

export function EdlList({ groups, className = "" }: EdlListProps) {
  return (
    <div className={["flex flex-col gap-2 p-3 bg-surface-2 rounded-md", className].join(" ")}>
      {groups.map((group) => (
        <EdlGroup key={group.index} {...group} />
      ))}
    </div>
  );
}
