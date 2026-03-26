import { useApp } from "../../context/AppContext";

const TAB_LABELS: Array<{ type: "materials" | "characters" | "edits"; label: string }> = [
  { type: "materials", label: "Materials" },
  { type: "characters", label: "Characters" },
  { type: "edits", label: "Edits" },
];

export function WorkspaceHeader() {
  const { page, navigate, projects, activeProjectId } = useApp();

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const hasProject = activeProjectId != null;

  // Determine active tab
  const activeTab =
    page.type === "materials" || page.type === "material-detail"
      ? "materials"
      : page.type === "characters" || page.type === "character-detail"
      ? "characters"
      : page.type === "edits" || page.type === "edit-detail"
      ? "edits"
      : null;

  return (
    <div
      className="flex items-center gap-2 px-4 flex-shrink-0 border-b"
      style={{
        height: "48px",
        background: "var(--color-bone-0)",
        borderColor: "var(--color-bone-50)",
      }}
    >
      {/* Back to home */}
      <button
        onClick={() => navigate({ type: "landing" })}
        className="w-8 h-8 flex items-center justify-center rounded-md text-[16px] transition-colors cursor-pointer"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Back to home"
      >
        ←
      </button>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
        {activeProject && (
          <span className="font-medium" style={{ color: "var(--color-text)" }}>
            {activeProject.name}
          </span>
        )}
      </div>

      {/* Tabs */}
      {hasProject && (
        <div className="flex items-center h-full ml-6">
          {TAB_LABELS.map((tab) => (
            <button
              key={tab.type}
              onClick={() => navigate({ type: tab.type, projectId: activeProjectId! })}
              className="h-full px-4 text-[11px] font-medium border-b-2 transition-colors cursor-pointer"
              style={{
                borderBottomColor: activeTab === tab.type ? "var(--color-navy-700)" : "transparent",
                color:
                  activeTab === tab.type
                    ? "var(--color-navy-700)"
                    : "var(--color-text-muted)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
