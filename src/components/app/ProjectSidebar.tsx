import { useState } from "react";
import { useApp, type Project } from "../../context/AppContext";

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProjectSidebar() {
  const { projects, projectsLoading, activeProjectId, setActiveProject, createProject } = useApp();
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const project = await createProject(name);
      setNewName("");
      setShowNewInput(false);
      setActiveProject(project.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="flex flex-col h-full w-[220px]"
      style={{ background: "var(--color-navy-900)" }}
    >
      {/* Logo */}
      <div
        className="px-4 py-4 flex-shrink-0 border-b"
        style={{ borderColor: "var(--color-navy-700)" }}
      >
        <span
          className="text-[14px] font-semibold tracking-tight"
          style={{ color: "var(--color-bone-0)" }}
        >
          SuperCut
        </span>
      </div>

      {/* New project button */}
      <div className="p-3 flex-shrink-0">
        {showNewInput ? (
          <div className="flex gap-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setShowNewInput(false); setNewName(""); }
              }}
              placeholder="Project name"
              className="flex-1 px-2 py-1.5 text-[11px] rounded-md outline-none min-w-0"
              style={{
                background: "var(--color-navy-700)",
                color: "var(--color-bone-0)",
                border: "1px solid var(--color-navy-600)",
              }}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-2 py-1.5 rounded-md text-[11px] font-medium cursor-pointer"
              style={{ background: "var(--color-accent)", color: "white" }}
            >
              {creating ? "…" : "→"}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewInput(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-[11px] cursor-pointer transition-colors"
            style={{
              background: "var(--color-navy-700)",
              color: "var(--color-bone-0)",
            }}
          >
            <span>+</span>
            New Project
          </button>
        )}
      </div>

      {/* Project list */}
      <div
        className="px-3 mb-1 text-[9px] font-medium uppercase tracking-[0.06em]"
        style={{ color: "var(--color-slate-400)" }}
      >
        Recent
      </div>

      <div className="flex-1 overflow-y-auto">
        {projectsLoading ? (
          <div className="px-4 py-3 text-[11px]" style={{ color: "var(--color-slate-400)" }}>
            Loading...
          </div>
        ) : projects.length === 0 ? (
          <div className="px-4 py-3 text-[11px]" style={{ color: "var(--color-slate-400)" }}>
            No projects yet
          </div>
        ) : (
          projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              active={project.id === activeProjectId}
              onSelect={() => setActiveProject(project.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  active,
  onSelect,
}: {
  project: Project;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md mx-0 mb-0.5 cursor-pointer transition-colors text-left"
      style={{
        background: active ? "var(--color-navy-700)" : "transparent",
      }}
    >
      {/* Thumbnail placeholder */}
      <div
        className="w-8 h-6 rounded-[4px] flex-shrink-0"
        style={{ background: "var(--color-navy-600)" }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="text-[11px] font-medium truncate"
          style={{ color: "var(--color-bone-0)" }}
        >
          {project.name}
        </div>
        <div className="text-[9px] mt-0.5" style={{ color: "var(--color-slate-400)" }}>
          {formatRelativeDate(project.updatedAt)}
        </div>
      </div>
    </button>
  );
}
