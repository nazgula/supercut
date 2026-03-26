import { AppProvider, useApp, type WorkspacePage } from "../context/AppContext";
import { HomeLanding } from "../components/app/HomeLanding";
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
  const { page } = useApp();

  // Landing: full-screen home, no chat column, no sidebar
  if (page.type === "landing") {
    return <HomeLanding />;
  }

  // Project open: chat column LEFT, workspace RIGHT
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bone-25)" }}>
      {/* Chat column — left, no header */}
      <ChatColumn />

      {/* Workspace column — right */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <WorkspaceHeader />
        <div className="flex-1 overflow-y-auto p-5">
          <WorkspaceRouter page={page} />
        </div>
      </div>
    </div>
  );
}

function WorkspaceRouter({ page }: { page: WorkspacePage }) {
  switch (page.type) {
    case "landing":
      return null;
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
