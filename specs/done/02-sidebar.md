# Spec 02 — Project Sidebar

## Goal
Sidebar with project list, new project button, collapsible behavior. Wired to real API.

## Scope
- `ProjectSidebar` component
- Project list from `projects.list`
- "New Project" flow (name entry in chat → here we just show a button that sets page state)
- Collapsible with CSS transition

## Design (from wireframe)
- `bg-navy-900`, width 220px
- Header: "SuperCut" logo
- Section label: "RECENT" (uppercase, muted)
- Each project row: 32×24px thumbnail placeholder + name + meta (`N clips · Xh ago`)
  - meta requires clip count — NOT available in `projects.list` (only id/name/dates)
  - Use relative date only: "2h ago", "1d ago" from `updatedAt`
  - Clip count: omit (not in API response — flag in open_issues)
- Active state: `bg-navy-500` highlight
- "+ New Project" button: triggers `page = { type: 'new-project-chat' }` (handled in chat column spec)

## Component: `ProjectSidebar`
```tsx
interface ProjectSidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelect: (id: string) => void;
  onNewProject: () => void;
  collapsed: boolean;
}
```

## Collapsible
- CSS: `transition: width 0.2s ease, margin-left 0.2s ease`
- Collapsed: `width: 0; overflow: hidden`
- Toggle button lives in workspace header (spec 03)

## API gap
- `projects.list` does not return clip count per project
- Log in open_issues.md

## Acceptance criteria
- Projects load from API on mount
- Active project highlighted
- Collapse/expand works smoothly
- "New Project" button fires `onNewProject` callback
