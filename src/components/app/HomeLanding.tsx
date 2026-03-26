import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { ProjectCard } from "./ProjectCard";

// ─── HomeLanding ───────────────────────────────────────────────
//
// Two-column layout on a 12-column CSS grid:
//   col 1       — left margin (bone-0)
//   cols 2–5    — chat/greeting side (bone-0)
//   cols 6–11   — project list side (bone-25)
//   col 12      — right margin (bone-25)
//
// At xl (≥1280px): margins widen to 2 cols each, content shifts inward.

export function HomeLanding() {
  const { projects, projectsLoading, setActiveProject, createProject, setPendingMessage } = useApp();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);

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
      const project = await createProject(trimmed.slice(0, 40));
      setPendingMessage(trimmed);
      setActiveProject(project.id);
    } finally {
      setCreating(false);
    }
  }

  const sortedProjects = projects.slice().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr repeat(10, 1fr) 1fr",
        background: "var(--color-bone-25)",
      }}
    >
      {/* Left margin — bone-0 to match chat column */}
      <div style={{ background: "var(--color-bone-0)", gridColumn: "1 / 2" }} />

      {/* Chat / greeting column — cols 2–5 */}
      <div
        className="flex flex-col justify-center overflow-hidden"
        style={{
          gridColumn: "2 / 6",
          background: "var(--color-bone-0)",
          borderRight: "1px solid var(--color-bone-50)",
          padding: "0 18%",
        }}
      >
        {/* Greeting */}
        <h1
          className="font-semibold leading-tight"
          style={{ fontSize: "32px", color: "var(--color-text)", marginBottom: "6px" }}
        >
          {greeting}
        </h1>
        <p
          style={{ fontSize: "18px", color: "var(--color-text-secondary)", marginBottom: "28px" }}
        >
          What are we editing today?
        </p>

        {/* Input box */}
        <div
          className="rounded-[10px] overflow-hidden"
          style={{
            background: "var(--color-bone-25)",
            border: "1px solid var(--color-bone-50)",
            padding: "16px",
          }}
        >
          <textarea
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
            className="w-full resize-none outline-none"
            style={{
              fontSize: "16px",
              color: "var(--color-text)",
              background: "transparent",
              fontFamily: "var(--font-sans)",
            }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleStart}
              disabled={!text.trim() || creating}
              className="cursor-pointer font-medium rounded-lg transition-colors"
              style={{
                fontSize: "16px",
                padding: "10px 20px",
                background: text.trim() && !creating ? "var(--color-accent)" : "var(--color-bone-100)",
                color: text.trim() && !creating ? "white" : "var(--color-text-muted)",
              }}
            >
              {creating ? "Creating…" : "Start →"}
            </button>
          </div>
        </div>
      </div>

      {/* Project list column — cols 6–11 */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          gridColumn: "6 / 12",
          background: "var(--color-bone-25)",
          padding: "20vh 20% 20vh",
        }}
      >
        <div
          className="font-medium uppercase flex-shrink-0"
          style={{
            fontSize: "14px",
            letterSpacing: "0.5px",
            color: "var(--color-text-muted)",
            marginBottom: "16px",
          }}
        >
          Recent Projects
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2">
          {projectsLoading && (
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Loading…</p>
          )}

          {!projectsLoading && sortedProjects.length === 0 && (
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              No projects yet — describe your first edit on the left.
            </p>
          )}

          {sortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => setActiveProject(project.id)}
            />
          ))}
        </div>
      </div>

      {/* Right margin — bone-25 to match project column */}
      <div style={{ background: "var(--color-bone-25)", gridColumn: "12 / 13" }} />
    </div>
  );
}
