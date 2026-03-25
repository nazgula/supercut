import { useState } from "react";

interface Project {
  id: string;
  name: string;
  duration: string;
  status: "Ready" | "Draft" | "Exporting" | "Processing";
}

const RECENT_PROJECTS: Project[] = [
  { id: "1", name: "Brand Launch 2026",  duration: "2:28", status: "Ready" },
  { id: "2", name: "Q4 Product Demo",    duration: "1:45", status: "Draft" },
  { id: "3", name: "Team Intro Series",  duration: "5:12", status: "Exporting" },
];

export default function HomePage() {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [input, setInput] = useState("");

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar activeProject={activeProject} onSelect={setActiveProject} />
      <Main input={input} onInputChange={setInput} />
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────

interface SidebarProps {
  activeProject: string | null;
  onSelect: (id: string) => void;
}

function Sidebar({ activeProject, onSelect }: SidebarProps) {
  return (
    <aside className="w-[220px] flex-shrink-0 flex flex-col bg-surface-2 border-r border-border">
      {/* Head */}
      <div className="px-4 py-3 border-b border-border">
        <span className="text-[13px] font-semibold text-text">
          SuperCut{" "}
          <span className="text-text-muted font-normal">v0.4</span>
        </span>
      </div>

      {/* Actions */}
      <div className="p-3 flex flex-col gap-1">
        <SidebarButton icon="+" label="New project" />
        <SidebarButton icon="↑" label="Upload files" />
      </div>

      {/* Recent projects */}
      <div className="px-4 pt-3 pb-1 text-[9px] font-medium text-text-muted uppercase tracking-[0.06em]">
        Recent projects
      </div>

      <div className="flex-1 overflow-y-auto">
        {RECENT_PROJECTS.map((project) => (
          <SidebarItem
            key={project.id}
            project={project}
            active={activeProject === project.id}
            onClick={() => onSelect(project.id)}
          />
        ))}
      </div>
    </aside>
  );
}

function SidebarButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="w-full py-2 px-3 border border-border rounded-sm text-[11px] text-text-secondary bg-surface text-left flex items-center gap-2 cursor-pointer transition-all hover:border-border-strong hover:text-text">
      <span className="text-text-muted text-xs">{icon}</span>
      {label}
    </button>
  );
}

function SidebarItem({
  project,
  active,
  onClick,
}: {
  project: Project;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={[
        "py-2 px-4 cursor-pointer border-l-2 transition-all",
        active
          ? "bg-surface border-l-navy-900"
          : "border-l-transparent hover:bg-surface",
      ].join(" ")}
    >
      <div className="text-[11px] font-medium text-text mb-px">{project.name}</div>
      <div className="text-[9px] text-text-muted">
        {project.duration} · {project.status}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────

function Main({
  input,
  onInputChange,
}: {
  input: string;
  onInputChange: (v: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col bg-surface min-w-0">
      {/* Greeting — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-[400px]">
          <h1 className="text-[20px] font-semibold text-text mb-2">SuperCut</h1>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            What are we working on today?
            <br />
            Pick a project from the sidebar, or just start describing what you
            need.
          </p>
        </div>
      </div>

      {/* Input area — pinned to bottom */}
      <div className="px-4 py-4 border-t border-border">
        <div className="max-w-[560px] mx-auto">
          <ChatInputBar value={input} onChange={onInputChange} />
        </div>
      </div>
    </div>
  );
}

// ─── Chat input bar ──────────────────────────────────────────

function ChatInputBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg">
      <ToolBtn aria-label="Attach file">📎</ToolBtn>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe what you need, or upload files to get started..."
        className="flex-1 border-none bg-transparent text-[12px] text-text outline-none px-2 py-1 font-sans placeholder:text-text-muted min-w-0"
      />

      <ToolBtn aria-label="Voice input">🎤</ToolBtn>

      <ToolBtn
        aria-label="Send"
        primary
        onClick={() => onChange("")}
      >
        ↑
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  children,
  primary = false,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        "w-8 h-8 rounded-full flex items-center justify-center cursor-pointer flex-shrink-0 text-xs transition-all",
        primary
          ? "bg-navy-700 border border-navy-700 text-text-on-dark hover:bg-navy-600"
          : "border border-border-light bg-surface text-text-muted hover:border-border-strong hover:text-text-secondary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
