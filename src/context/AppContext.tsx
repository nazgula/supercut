import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { RpcError } from "../api/rpc";
import { cachedRpcCall } from "../api/cachedRpc";

// ─── Types ────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkspacePage =
  | { type: "landing" }
  | { type: "materials"; projectId: string }
  | { type: "material-detail"; projectId: string; clipId: string }
  | { type: "characters"; projectId: string }
  | { type: "character-detail"; projectId: string; groupId: string }
  | { type: "edits"; projectId: string }
  | { type: "edit-detail"; projectId: string; editId: string; tab: "edl" | "renders" };

// ─── Context ──────────────────────────────────────────────────

interface AppContextValue {
  projects: Project[];
  projectsLoading: boolean;
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
  createProject: (name: string) => Promise<Project>;
  refreshProjects: () => Promise<void>;

  page: WorkspacePage;
  navigate: (page: WorkspacePage) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;

  pendingMessage: string | null;
  setPendingMessage: (msg: string | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [page, setPage] = useState<WorkspacePage>({ type: "landing" });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await cachedRpcCall<{ projects: Project[] }>("projects.list");
      setProjects(data.projects);
    } catch (err) {
      if (err instanceof RpcError) console.error("Failed to load projects:", err.message);
    }
  }, []);

  useEffect(() => {
    setProjectsLoading(true);
    refreshProjects().finally(() => setProjectsLoading(false));
  }, [refreshProjects]);

  const setActiveProject = useCallback((id: string) => {
    setActiveProjectId(id);
    setPage({ type: "materials", projectId: id });
  }, []);

  const createProject = useCallback(async (name: string): Promise<Project> => {
    const data = await cachedRpcCall<{ project: Project }>("projects.create", { name });
    await refreshProjects();
    return data.project;
  }, [refreshProjects]);

  const navigate = useCallback((newPage: WorkspacePage) => {
    setPage(newPage);
    if ("projectId" in newPage) {
      setActiveProjectId(newPage.projectId);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((v) => !v);
  }, []);

  return (
    <AppContext.Provider
      value={{
        projects,
        projectsLoading,
        activeProjectId,
        setActiveProject,
        createProject,
        refreshProjects,
        page,
        navigate,
        sidebarOpen,
        toggleSidebar,
        pendingMessage,
        setPendingMessage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
