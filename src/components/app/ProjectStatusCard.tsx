import { useState, useEffect } from "react";
import { cachedRpcCall } from "../../api/cachedRpc";
import type { ProjectSummary, ProjectStatus } from "../../chat/types";

interface ProjectStatusCardProps {
  projectId: string;
}

const STATUS_LABELS: Record<ProjectStatus, { label: string; color: string }> = {
  idle: { label: "Ready", color: "var(--color-success)" },
  ingesting: { label: "Ingesting", color: "var(--color-warning)" },
  rendering: { label: "Rendering", color: "var(--color-info)" },
  error: { label: "Has errors", color: "var(--color-error)" },
};

export function ProjectStatusCard({ projectId }: ProjectStatusCardProps) {
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [clipsData, facesData, editsData] = await Promise.all([
          cachedRpcCall<{ clips: Array<{ status: string }> }>("clips.list", { projectId }),
          cachedRpcCall<{ groups: unknown[] }>("faces.list", { projectId }),
          cachedRpcCall<{ edits: unknown[] }>("edits.list", { projectId }),
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
      } catch {
        // Silently fail — card is informational, not critical
      }
    }

    load();
    return () => { cancelled = true; };
  }, [projectId]);

  if (!summary || dismissed) return null;

  const { label, color } = STATUS_LABELS[summary.status];

  return (
    <div
      className="rounded-[10px] border mb-3 overflow-hidden"
      style={{ borderColor: "var(--color-bone-50)", background: "var(--color-bone-25)" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span className="text-[14px] font-medium" style={{ color: "var(--color-text)" }}>
            {label}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-[12px] cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
        >
          ✕
        </button>
      </div>
      <div
        className="flex gap-6 px-4 pb-3 text-[12px]"
        style={{ color: "var(--color-text-secondary)" }}
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
    </div>
  );
}
