import { useApp } from "../../context/AppContext";

const TAB_LABELS: Array<{ type: "materials" | "characters" | "edits"; label: string }> = [
  { type: "materials", label: "Materials" },
  { type: "characters", label: "Characters" },
  { type: "edits", label: "Edits" },
];

export function WorkspaceHeader() {
  const { page, navigate, activeProjectId } = useApp();

  const activeTab =
    page.type === "materials" || page.type === "material-detail"
      ? "materials"
      : page.type === "characters" || page.type === "character-detail"
      ? "characters"
      : page.type === "edits" || page.type === "edit-detail"
      ? "edits"
      : null;

  if (!activeProjectId) return null;

  return (
    <div
      className="flex items-center px-4 flex-shrink-0 border-b"
      style={{
        height: "48px",
        background: "var(--color-bone-0)",
        borderColor: "var(--color-bone-50)",
      }}
    >
      <div className="flex items-center h-full">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => navigate({ type: tab.type, projectId: activeProjectId })}
            className="h-full px-4 text-[14px] font-medium border-b-2 transition-colors cursor-pointer"
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
    </div>
  );
}
