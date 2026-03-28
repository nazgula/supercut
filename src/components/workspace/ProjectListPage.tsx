import { useApp } from "../../context/AppContext";
import { ProjectCard } from "../app/ProjectCard";

export function ProjectListPage() {
  const { projects, projectsLoading, setActiveProject } = useApp();

  const sortedProjects = projects.slice().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ padding: "20vh 20%" }}
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
  );
}
