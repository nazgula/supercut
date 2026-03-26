import { useState, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

// Derive a stable accent color from a string (project name)
function projectColor(name: string): string {
  const colors = [
    "var(--color-navy-900)",
    "var(--color-navy-700)",
    "var(--color-navy-500)",
    "#5C7A8A",
    "#3D5A6B",
    "#2E4A5A",
    "#7A6040",
    "#4A5C3D",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

function relativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return diffMin <= 1 ? "Just now" : `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}

const RECENT_COUNT = 5;

export function HomeLanding() {
  const { projects, projectsLoading, setActiveProject, createProject, setPendingMessage } = useApp();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good morning, ${firstName}` :
    hour < 18 ? `Good afternoon, ${firstName}` :
                `Good evening, ${firstName}`;

  async function handleStart() {
    const trimmed = text.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const projectName = trimmed.slice(0, 40);
      const project = await createProject(projectName);
      // Store the original text as the first chat message
      setPendingMessage(trimmed);
      setActiveProject(project.id);
    } finally {
      setCreating(false);
    }
  }

  const recentProjects = projects.slice().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const visibleProjects = showAll ? recentProjects : recentProjects.slice(0, RECENT_COUNT);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "var(--color-bone-0)" }}
    >
      {/* Centered content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[680px] mx-auto px-6 pt-[18vh] pb-16">

          {/* Greeting */}
          <h1
            className="text-[32px] font-semibold mb-2 leading-tight"
            style={{ color: "var(--color-text)" }}
          >
            {greeting}
          </h1>
          <p
            className="text-[14px] mb-7"
            style={{ color: "var(--color-text-secondary)" }}
          >
            What are we editing today?
          </p>

          {/* Chat input */}
          <div
            className="rounded-xl border overflow-hidden mb-10"
            style={{ borderColor: "var(--color-bone-50)", background: "white" }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleStart();
                }
              }}
              placeholder="Describe your project — footage type, story, characters…"
              rows={3}
              disabled={creating}
              className="w-full px-4 pt-3.5 pb-2 text-[13px] resize-none outline-none"
              style={{ color: "var(--color-text)", background: "transparent" }}
            />
            <div className="flex justify-end px-3 pb-2.5">
              <button
                onClick={handleStart}
                disabled={!text.trim() || creating}
                className="px-4 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-opacity"
                style={{
                  background: text.trim() && !creating ? "var(--color-accent)" : "var(--color-bone-50)",
                  color: text.trim() && !creating ? "white" : "var(--color-text-muted)",
                }}
              >
                {creating ? "Creating…" : "Start →"}
              </button>
            </div>
          </div>

          {/* Recent projects */}
          {!projectsLoading && projects.length > 0 && (
            <div>
              <div
                className="text-[11px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--color-text-muted)" }}
              >
                Recent Projects
              </div>

              <div
                className={[
                  "flex flex-wrap gap-3",
                  showAll ? "max-h-[400px] overflow-y-auto pr-1" : "",
                ].join(" ")}
              >
                {visibleProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setActiveProject(project.id)}
                    className="group flex flex-col rounded-xl overflow-hidden border text-left transition-all cursor-pointer hover:shadow-md"
                    style={{
                      width: "150px",
                      borderColor: "var(--color-bone-50)",
                      background: "var(--color-bone-0)",
                    }}
                  >
                    {/* Color strip */}
                    <div
                      className="h-[40px] w-full flex-shrink-0"
                      style={{ background: projectColor(project.name) }}
                    />
                    {/* Info */}
                    <div className="px-3 py-2.5 flex-1">
                      <div
                        className="text-[12px] font-medium truncate mb-0.5"
                        style={{ color: "var(--color-text)" }}
                        title={project.name}
                      >
                        {project.name}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {relativeDate(project.updatedAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {!showAll && recentProjects.length > RECENT_COUNT && (
                <button
                  onClick={() => setShowAll(true)}
                  className="mt-3 text-[11px] cursor-pointer"
                  style={{ color: "var(--color-navy-700)" }}
                >
                  More ({recentProjects.length - RECENT_COUNT} more projects)
                </button>
              )}
            </div>
          )}

          {projectsLoading && (
            <div className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              Loading projects…
            </div>
          )}

          {!projectsLoading && projects.length === 0 && (
            <div className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              No projects yet — describe your first edit above to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
