import { useState, useEffect, useCallback, useRef } from "react";
import { rpcCall } from "../../api/rpc";
import { cachedRpcCall } from "../../api/cachedRpc";
import { useApp } from "../../context/AppContext";

// ─── Types ────────────────────────────────────────────────────

interface Render {
  id: string;
  status: "rendering" | "done" | "error";
  videoUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface Edit {
  id: string;
  title: string;
}

interface Remark {
  id: string;
  time: number;
  text: string;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
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

// ─── Component ────────────────────────────────────────────────

export function ScreeningPage({
  projectId,
  editId,
}: {
  projectId: string;
  editId: string;
}) {
  const { navigate } = useApp();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [renders, setRenders] = useState<Render[]>([]);
  const [activeRenderId, setActiveRenderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [remarkInput, setRemarkInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [editsData, rendersData] = await Promise.all([
        cachedRpcCall<{ edits: Edit[] }>("edits.list", { projectId }),
        cachedRpcCall<{ renders: Render[] }>("edits.renders", { editId }),
      ]);

      const foundEdit = (editsData.edits ?? []).find((e) => e.id === editId);
      setEdit(foundEdit ?? null);

      const sorted = (rendersData.renders ?? []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRenders(sorted);

      // Auto-select latest done render
      if (!activeRenderId) {
        const latestDone = sorted.find((r) => r.status === "done");
        if (latestDone) setActiveRenderId(latestDone.id);
      }
    } catch { /* silent */ }
  }, [projectId, editId, activeRenderId]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Poll if any render is in progress
  useEffect(() => {
    const anyRendering = renders.some((r) => r.status === "rendering");
    if (anyRendering && !pollRef.current) {
      pollRef.current = setInterval(loadData, 3000);
    }
    if (!anyRendering && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [renders, loadData]);

  const activeRender = renders.find((r) => r.id === activeRenderId);

  function addRemark() {
    if (!remarkInput.trim() || !videoRef.current) return;
    const time = videoRef.current.currentTime;
    setRemarks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), time, text: remarkInput.trim() },
    ].sort((a, b) => a.time - b.time));
    setRemarkInput("");
  }

  if (loading) {
    return <div className="text-[14px] text-center py-12" style={{ color: "var(--color-text-muted)" }}>Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-medium" style={{ color: "var(--color-text)" }}>
          Screening{edit ? ` — ${edit.title}` : ""}
        </h2>
        <button
          onClick={() => navigate({ type: "edit-detail", projectId, editId, tab: "edl" })}
          className="text-[12px] cursor-pointer"
          style={{ color: "var(--color-navy-700)" }}
        >
          ← Back to EDL
        </button>
      </div>

      {/* Video player */}
      {activeRender?.status === "done" && activeRender.videoUrl ? (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-bone-50)" }}>
          <video
            ref={videoRef}
            src={activeRender.videoUrl}
            controls
            className="w-full"
            style={{ background: "#000", maxHeight: "400px" }}
          />
        </div>
      ) : activeRender?.status === "rendering" ? (
        <div
          className="flex items-center justify-center rounded-xl border py-16"
          style={{ borderColor: "var(--color-bone-50)", background: "var(--color-bone-25)" }}
        >
          <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" style={{ color: "var(--color-navy-700)" }} />
          <span className="text-[14px]" style={{ color: "var(--color-text-secondary)" }}>Rendering…</span>
        </div>
      ) : activeRender?.status === "error" ? (
        <div
          className="rounded-xl border px-4 py-4"
          style={{ borderColor: "var(--color-error)", background: "var(--color-error-subtle)", color: "var(--color-error)" }}
        >
          <div className="text-[14px] font-medium mb-1">Render failed</div>
          <div className="text-[12px]">{activeRender.errorMessage || "Unknown error"}</div>
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-xl border py-16"
          style={{ borderColor: "var(--color-bone-50)", background: "var(--color-bone-25)" }}
        >
          <span className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>No render available</span>
        </div>
      )}

      {/* Remarks */}
      {activeRender?.status === "done" && (
        <div>
          <div className="text-[14px] font-medium mb-2" style={{ color: "var(--color-text)" }}>
            Remarks
          </div>
          <div className="flex gap-2 mb-3">
            <input
              value={remarkInput}
              onChange={(e) => setRemarkInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addRemark(); }}
              placeholder="Pause video, type a remark…"
              className="flex-1 px-3 py-2 rounded-lg text-[14px] outline-none border"
              style={{ borderColor: "var(--color-bone-50)", background: "white", color: "var(--color-text)" }}
            />
            <button
              onClick={addRemark}
              disabled={!remarkInput.trim()}
              className="px-3 py-2 rounded-lg text-[12px] font-medium cursor-pointer"
              style={{
                background: remarkInput.trim() ? "var(--color-accent)" : "var(--color-bone-50)",
                color: remarkInput.trim() ? "white" : "var(--color-text-muted)",
              }}
            >
              Add
            </button>
          </div>
          {remarks.length > 0 && (
            <div className="flex flex-col gap-1">
              {remarks.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg text-[12px]"
                  style={{ background: "var(--color-bone-25)" }}
                >
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = r.time;
                        videoRef.current.play();
                      }
                    }}
                    className="font-mono flex-shrink-0 cursor-pointer"
                    style={{ color: "var(--color-navy-700)" }}
                  >
                    {formatTime(r.time)}
                  </button>
                  <span style={{ color: "var(--color-text)" }}>{r.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Render history */}
      <div>
        <div className="text-[14px] font-medium mb-2" style={{ color: "var(--color-text)" }}>
          Renders
        </div>
        {renders.length === 0 ? (
          <div className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>No renders yet</div>
        ) : (
          <div className="flex flex-col gap-1">
            {renders.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveRenderId(r.id)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-left cursor-pointer transition-colors"
                style={{
                  background: r.id === activeRenderId ? "var(--color-bone-25)" : "transparent",
                  border: r.id === activeRenderId ? "1px solid var(--color-bone-50)" : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background:
                        r.status === "done" ? "var(--color-success)"
                        : r.status === "rendering" ? "var(--color-warning)"
                        : "var(--color-error)",
                    }}
                  />
                  <span className="text-[12px]" style={{ color: "var(--color-text)" }}>
                    {r.status === "done" ? "Complete" : r.status === "rendering" ? "Rendering…" : "Failed"}
                  </span>
                </div>
                <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
                  {relativeDate(r.createdAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
