# Spec 01 — App Shell

## Goal
Replace `HomePage` with the v6.1 two-column layout: collapsible sidebar + workspace + chat column. Establish the state machine and context that all other specs build on.

## Scope
- New `AppContext` — shared project + workspace state
- `AppShell` component replacing `HomePage`
- `WorkspacePage` type enum (local state, no URL routing — desktop app)
- Sidebar toggle logic

## Architecture decision
No URL-based routing for workspace pages. This is a desktop app; there is no browser chrome, no back button. All navigation is local state. `react-router` stays for the auth/landing split, but the workspace is a state machine inside a single route.

## WorkspacePage type
```ts
type WorkspacePage =
  | { type: 'landing' }
  | { type: 'materials'; projectId: string }
  | { type: 'material-detail'; projectId: string; clipId: string }
  | { type: 'characters'; projectId: string }
  | { type: 'character-detail'; projectId: string; groupId: string }
  | { type: 'edits'; projectId: string }
  | { type: 'edit-detail'; projectId: string; editId: string; tab: 'edl' | 'suggestions' | 'renders' }
```

## AppContext shape
```ts
interface AppContextValue {
  // Projects
  projects: Project[];
  projectsLoading: boolean;
  activeProjectId: string | null;
  setActiveProject: (id: string) => void;
  createProject: (name: string) => Promise<Project>;
  refreshProjects: () => Promise<void>;

  // Workspace navigation
  page: WorkspacePage;
  navigate: (page: WorkspacePage) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}
```

## Implementation steps
1. Create `src/context/AppContext.tsx` with above shape
   - Fetch `projects.list` on mount
   - `createProject` calls `projects.create`, then refreshes list
2. Create `src/pages/AppShell.tsx`:
   - `<div class="flex h-screen overflow-hidden bg-bone-25">`
   - `<ProjectSidebar />` (220px, collapsible)
   - `<div class="flex-1 flex overflow-hidden">` containing workspace + chat column
3. Update `App.tsx`: route `/` → `AppShell` (replace `HomePage`)
4. Stub workspace body as `<WorkspaceRouter page={page} />` — renders placeholder for now
5. Stub chat column as empty box — filled in spec 07

## Acceptance criteria
- App loads, sidebar shows project list from API
- Sidebar collapses/expands with toggle button
- Selecting a project sets `activeProjectId` and navigates to `materials` page
- Routes still work: `/auth`, `/landing`

## Open questions
- None — clear scope
