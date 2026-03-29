import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { cachedRpcCall } from "../../api/cachedRpc";
import type { ProjectSummary, ProjectStatus } from "../../chat/types";

const STATUS_LABELS: Record<ProjectStatus, { label: string; color: string }> = {
  idle: { label: "Ready", color: "var(--color-success)" },
  ingesting: { label: "Ingesting", color: "var(--color-warning)" },
  rendering: { label: "Rendering", color: "var(--color-info)" },
  error: { label: "Has errors", color: "var(--color-error)" },
};

interface ProjectStatusCardProps {
  projectId: string;
}

export function ProjectStatusCard({ projectId }: ProjectStatusCardProps) {
  const { projects } = useApp();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);

  const project = projects.find((p) => p.id === projectId);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Each call is independent — one failure doesn't block the others
      const [clipsData, facesData, editsData] = await Promise.all([
        cachedRpcCall<{ clips: Array<{ status: string }> }>("clips.list", { projectId }).catch(() => ({ clips: [] })),
        cachedRpcCall<{ groups: unknown[] }>("faces.list", { projectId }).catch(() => ({ groups: [] })),
        cachedRpcCall<{ edits: unknown[] }>("edits.list", { projectId }).catch(() => ({ edits: [] })),
      ]);

      if (cancelled) return;

      const clips = clipsData.clips ?? [];
      const ready = clips.filter((c) => c.status === "ready").length;
      const processing = clips.filter((c) => c.status === "processing").length;
      const error = clips.filter((c) => c.status === "error").length;

      let status: ProjectStatus = "idle";
      if (processing > 0) status = "ingesting";
      if (error > 0 && processing === 0) status = "error";

      setSummary({
        clipCount: clips.length,
        clipsByStatus: { ready, processing, error },
        characterCount: (facesData.groups ?? []).length,
        editCount: (editsData.edits ?? []).length,
        status,
      });
    }

    load();
    return () => { cancelled = true; };
  }, [projectId]);

  const { label, color } = summary
    ? STATUS_LABELS[summary.status]
    : { label: "Loading…", color: "var(--color-text-muted)" };

  return (
    <div>
      {/* Welcome heading */}
      <div className="font-medium mb-2" style={{ color: "var(--color-text)" }}>
        Welcome back{project ? ` to ${project.name}` : ""}
      </div>

      {/* Status + counts */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
        <span className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>
          {label}
        </span>
      </div>
      {summary && (
        <div
          className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]"
          style={{ color: "var(--color-text-muted)" }}
        >
          <span>{summary.clipCount} clip{summary.clipCount !== 1 ? "s" : ""}</span>
          <span>{summary.characterCount} character{summary.characterCount !== 1 ? "s" : ""}</span>
          <span>{summary.editCount} edit{summary.editCount !== 1 ? "s" : ""}</span>
          {summary.clipsByStatus.processing > 0 && (
            <span style={{ color: "var(--color-warning)" }}>
              {summary.clipsByStatus.processing} processing
            </span>
          )}
          {summary.clipsByStatus.error > 0 && (
            <span style={{ color: "var(--color-error)" }}>
              {summary.clipsByStatus.error} failed
            </span>
          )}
        </div>
      )}
    </div>
  );
}
