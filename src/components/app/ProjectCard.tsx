import type { Project } from "../../context/AppContext";

// ─── Helpers ──────────────────────────────────────────────────

function thumbGradient(name: string): string {
  const gradients = [
    "linear-gradient(135deg, var(--color-navy-900), var(--color-navy-700))",
    "linear-gradient(135deg, var(--color-navy-700), var(--color-slate-500))",
    "linear-gradient(135deg, var(--color-slate-500), var(--color-navy-700))",
    "linear-gradient(135deg, #5C7A8A, var(--color-navy-900))",
    "linear-gradient(135deg, #3D5A6B, var(--color-slate-500))",
    "linear-gradient(135deg, var(--color-navy-800), #5C7A8A)",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return gradients[hash % gradients.length];
}

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return diffMin <= 1 ? "Just now" : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── Placeholder thumbnail icon ────────────────────────────────

function ThumbPlaceholder() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="w-5 h-5"
      style={{ color: "var(--color-text-muted)", opacity: 0.5 }}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

// ─── ProjectCard ───────────────────────────────────────────────

interface ProjectCardProps {
  project: Project;
  clipCount?: number;
  onClick: () => void;
}

export function ProjectCard({ project, clipCount, onClick }: ProjectCardProps) {
  const timestamp = relativeDate(project.updatedAt);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-[10px] border overflow-hidden cursor-pointer transition-shadow hover:shadow-[0_2px_8px_rgba(30,51,64,0.06)]"
      style={{
        borderColor: "var(--color-bone-50)",
        background: "var(--color-bone-0)",
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-4 px-[18px] py-[14px]">
        {/* Thumbnail */}
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-[6px] overflow-hidden"
          style={{
            width: "72px",
            height: "48px",
            background: thumbGradient(project.name),
          }}
        >
          <ThumbPlaceholder />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className="text-[16px] font-medium truncate"
            style={{ color: "var(--color-text)" }}
            title={project.name}
          >
            {project.name}
          </div>
          <div
            className="text-[16px] truncate mt-0.5"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Video editing project
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-[18px] py-[8px] border-t"
        style={{
          background: "var(--color-bone-50)",
          borderColor: "var(--color-bone-50)",
        }}
      >
        <div /> {/* placeholder for future status flags */}
        <div
          className="flex items-center gap-3.5 text-[12px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          {clipCount != null && <span>{clipCount} materials</span>}
          <span>{timestamp}</span>
        </div>
      </div>
    </button>
  );
}
