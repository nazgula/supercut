import { AppProvider, useApp, type WorkspacePage } from "../context/AppContext";
import { ProjectSidebar } from "../components/app/ProjectSidebar";
import { WorkspaceHeader } from "../components/app/WorkspaceHeader";
import { ChatColumn } from "../components/app/ChatColumn";
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
  const { sidebarOpen, page } = useApp();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bone-25)" }}>
      {/* Sidebar */}
      <div
        className="flex-shrink-0 overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? "220px" : "0px" }}
      >
        <ProjectSidebar />
      </div>

      {/* Main: workspace + chat */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* Workspace column */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <WorkspaceHeader />
          <div className="flex-1 overflow-y-auto p-5">
            <WorkspaceRouter page={page} />
          </div>
        </div>

        {/* Chat column */}
        <ChatColumn />
      </div>
    </div>
  );
}

function WorkspaceRouter({ page }: { page: WorkspacePage }) {
  switch (page.type) {
    case "landing":
      return <WorkspaceLanding />;
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

function WorkspaceLanding() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: "var(--color-text-muted)" }}>
      <div className="text-5xl mb-4 opacity-40">🎬</div>
      <p className="text-[12px]">Select a project from the sidebar or start a new one</p>
    </div>
  );
}
