import { useState, useEffect, useCallback } from "react";
import { cachedRpcCall } from "../api/cachedRpc";

// ─── Types ────────────────────────────────────────────────────

export interface ProjectStatus {
  content: {
    total: number;
    processing: number;
    ready: number;
    error: number;
  };
  characters: {
    total: number;
  };
  edits: {
    total: number;
    hasTimeline: boolean;
  };
  renders: {
    total: number;
    latest: "rendering" | "done" | "error" | null;
  };
  hasScript: boolean;
  loading: boolean;
}

const EMPTY: ProjectStatus = {
  content: { total: 0, processing: 0, ready: 0, error: 0 },
  characters: { total: 0 },
  edits: { total: 0, hasTimeline: false },
  renders: { total: 0, latest: null },
  hasScript: false,
  loading: true,
};

// ─── API response shapes ─────────────────────────────────────

interface ClipRow {
  status: string;
}

interface EditRow {
  timeline: unknown[] | null;
}

interface RenderRow {
  status: string;
  createdAt: string;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useProjectStatus(projectId: string | null): ProjectStatus {
  const [status, setStatus] = useState<ProjectStatus>(EMPTY);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setStatus(EMPTY);
      return;
    }

    // Each call independent — one failure doesn't block others
    const [clipsData, facesData, editsData, scriptData] = await Promise.all([
      cachedRpcCall<{ clips: ClipRow[] }>("clips.list", { projectId }).catch(() => ({ clips: [] as ClipRow[] })),
      cachedRpcCall<{ groups: unknown[] }>("faces.list", { projectId }).catch(() => ({ groups: [] })),
      cachedRpcCall<{ edits: EditRow[] }>("edits.list", { projectId }).catch(() => ({ edits: [] as EditRow[] })),
      cachedRpcCall<{ script: string }>("projects.getScript", { projectId }).catch(() => ({ script: "" })),
    ]);

    const clips = clipsData.clips ?? [];
    const edits = editsData.edits ?? [];

    // Derive render status from the first edit that has renders
    let renderTotal = 0;
    let latestRenderStatus: "rendering" | "done" | "error" | null = null;

    if (edits.length > 0) {
      // Fetch renders for the most recent edit
      try {
        const firstEdit = edits[0] as EditRow & { id: string };
        if (firstEdit?.id) {
          const rendersData = await cachedRpcCall<{ renders: RenderRow[] }>(
            "edits.renders",
            { editId: firstEdit.id }
          ).catch(() => ({ renders: [] as RenderRow[] }));

          const renders = rendersData.renders ?? [];
          renderTotal = renders.length;
          if (renders.length > 0) {
            // Latest render by creation time
            const sorted = [...renders].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            latestRenderStatus = sorted[0].status as "rendering" | "done" | "error";
          }
        }
      } catch { /* ignore */ }
    }

    setStatus({
      content: {
        total: clips.length,
        processing: clips.filter((c) => c.status === "processing").length,
        ready: clips.filter((c) => c.status === "ready").length,
        error: clips.filter((c) => c.status === "error").length,
      },
      characters: {
        total: (facesData.groups ?? []).length,
      },
      edits: {
        total: edits.length,
        hasTimeline: edits.some((e) => e.timeline != null && Array.isArray(e.timeline) && e.timeline.length > 0),
      },
      renders: {
        total: renderTotal,
        latest: latestRenderStatus,
      },
      hasScript: !!(scriptData.script?.trim()),
      loading: false,
    });
  }, [projectId]);

  useEffect(() => {
    setStatus(EMPTY);
    refresh();
  }, [refresh]);

  // Re-poll when clips are updated (processing → ready transitions)
  useEffect(() => {
    function onClipsUpdate() { refresh(); }
    window.addEventListener("supercut:clips-update", onClipsUpdate);
    return () => window.removeEventListener("supercut:clips-update", onClipsUpdate);
  }, [refresh]);

  return status;
}
