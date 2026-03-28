import { AppProvider, useApp, type WorkspacePage } from "../context/AppContext";
import { ChatColumn } from "../components/app/ChatColumn";
import { ChatGreeting } from "../components/app/ChatGreeting";
import { ProjectListPage } from "../components/workspace/ProjectListPage";
import { MaterialsPage } from "../components/workspace/MaterialsPage";
import { MaterialDetailPage } from "../components/workspace/MaterialDetailPage";
import { CharactersPage } from "../components/workspace/CharactersPage";
import { CharacterDetailPage } from "../components/workspace/CharacterDetailPage";
import { EditsPage } from "../components/workspace/EditsPage";
import { EditDetailPage } from "../components/workspace/EditDetailPage";

const TAB_LABELS: Array<{ type: "materials" | "characters" | "edits"; label: string }> = [
  { type: "materials", label: "Materials" },
  { type: "characters", label: "Characters" },
  { type: "edits", label: "Edits" },
];

export default function AppShell() {
  return (
    <AppProvider>
      <AppShellInner />
    </AppProvider>
  );
}

function AppShellInner() {
  const { page, navigate, projects, activeProjectId } = useApp();
  const isLanding = page.type === "landing";
  const activeProject = projects.find((p) => p.id === activeProjectId);

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
      className="h-screen overflow-hidden flex flex-col"
      style={{ background: "var(--color-bone-25)" }}
    >
      {/* ─── Unified header — full width, hidden on landing ─── */}
      {!isLanding && (
        <div
          className="flex-shrink-0 border-b"
          style={{
            height: "48px",
            borderColor: "var(--color-bone-50)",
            display: "grid",
            gridTemplateColumns: "1fr repeat(10, 1fr) 1fr",
          }}
        >
          {/* Left margin bg */}
          <div style={{ background: "var(--color-bone-0)" }} />

          {/* Back arrow + project name — cols 2–5 */}
          <div
            className="flex items-center gap-2 pl-4"
            style={{
              gridColumn: "2 / 6",
              background: "var(--color-bone-0)",
              borderRight: "1px solid var(--color-bone-50)",
            }}
          >
            <button
              onClick={() => navigate({ type: "landing" })}
              className="w-8 h-8 flex items-center justify-center rounded-md text-[16px] transition-colors cursor-pointer"
              style={{ color: "var(--color-text-muted)" }}
              aria-label="Back to home"
            >
              ←
            </button>
            {activeProject && (
              <span
                className="text-[14px] font-medium truncate"
                style={{ color: "var(--color-text)" }}
              >
                {activeProject.name}
              </span>
            )}
          </div>

          {/* Workspace tabs — cols 6–11 */}
          <div
            className="flex items-center pl-4"
            style={{
              gridColumn: "6 / 12",
              background: "var(--color-bone-25)",
            }}
          >
            {activeProjectId && TAB_LABELS.map((tab) => (
              <button
                key={tab.type}
                onClick={() => navigate({ type: tab.type, projectId: activeProjectId })}
                className="h-full px-4 text-[14px] font-medium border-b-2 transition-colors cursor-pointer"
                style={{
                  borderBottomColor: activeTab === tab.type ? "var(--color-navy-700)" : "transparent",
                  color: activeTab === tab.type ? "var(--color-navy-700)" : "var(--color-text-muted)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right margin bg */}
          <div style={{ background: "var(--color-bone-25)" }} />
        </div>
      )}

      {/* ─── Content area — 12-col grid ─── */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr repeat(10, 1fr) 1fr",
        }}
      >
        {/* Left margin */}
        <div style={{ background: "var(--color-bone-0)", gridColumn: "1 / 2" }} />

        {/* Chat column — cols 2–5 */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            gridColumn: "2 / 6",
            background: "var(--color-bone-0)",
            borderRight: "1px solid var(--color-bone-50)",
          }}
        >
          {isLanding ? <ChatGreeting /> : <ChatColumn />}
        </div>

        {/* Workspace column — cols 6–11 */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            gridColumn: "6 / 12",
            background: "var(--color-bone-25)",
          }}
        >
          <div className={isLanding ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-5"}>
            <WorkspaceRouter page={page} />
          </div>
        </div>

        {/* Right margin */}
        <div style={{ background: "var(--color-bone-25)", gridColumn: "12 / 13" }} />
      </div>
    </div>
  );
}

function WorkspaceRouter({ page }: { page: WorkspacePage }) {
  switch (page.type) {
    case "landing":
      return <ProjectListPage />;
    case "materials":
      return <MaterialsPage projectId={page.projectId} />;
    case "material-detail":
      return <MaterialDetailPage projectId={page.projectId} clipId={page.clipId} />;
    case "characters":
      return <CharactersPage projectId={page.projectId} />;
    case "character-detail":
      return <CharacterDetailPage projectId={page.projectId} groupId={page.groupId} />;
    case "edits":
      return <EditsPage projectId={page.projectId} />;
    case "edit-detail":
      return <EditDetailPage projectId={page.projectId} editId={page.editId} tab={page.tab} />;
  }
}
