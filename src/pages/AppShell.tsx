import { AppProvider, useApp, type WorkspacePage } from "../context/AppContext";
import { ChatColumn } from "../components/app/ChatColumn";
import { ChatGreeting } from "../components/app/ChatGreeting";
import { WorkspaceHeader } from "../components/app/WorkspaceHeader";
import { ProjectListPage } from "../components/workspace/ProjectListPage";
import { MaterialsPage } from "../components/workspace/MaterialsPage";
import { MaterialDetailPage } from "../components/workspace/MaterialDetailPage";
import { CharactersPage } from "../components/workspace/CharactersPage";
import { CharacterDetailPage } from "../components/workspace/CharacterDetailPage";
import { EditsPage } from "../components/workspace/EditsPage";
import { EditDetailPage } from "../components/workspace/EditDetailPage";

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

  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr repeat(10, 1fr) 1fr",
        background: "var(--color-bone-25)",
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
        {/* Chat header — back arrow + project name (hidden on landing) */}
        {!isLanding && (
          <div
            className="flex items-center gap-2 px-[10%] flex-shrink-0 border-b"
            style={{
              height: "48px",
              borderColor: "var(--color-bone-50)",
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
        )}

        {/* Chat content */}
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
        {/* Workspace tabs — hidden on landing */}
        {!isLanding && <WorkspaceHeader />}

        {/* Workspace content */}
        <div className={isLanding ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto p-5"}>
          <WorkspaceRouter page={page} />
        </div>
      </div>

      {/* Right margin */}
      <div style={{ background: "var(--color-bone-25)", gridColumn: "12 / 13" }} />
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
