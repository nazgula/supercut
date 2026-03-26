import { useState, useEffect, useCallback, useRef } from "react";
import { rpcCall, RpcError } from "../../api/rpc";
import { useApp } from "../../context/AppContext";
import type { Edit } from "./EditsPage";
import type { Clip } from "./MaterialsPage";

// ─── Types ────────────────────────────────────────────────────

interface TimelineEntry {
  clip_id: string;
  shot_id: string;
  label: string;
  transition?: { type: string; duration: number };
  captions?: Array<{ text: string; speaker?: string }>;
}

interface Render {
  id: string;
  status: "rendering" | "done" | "error";
  videoUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

// ─── Component ────────────────────────────────────────────────

export function EditDetailPage({
  projectId,
  editId,
  tab,
}: {
  projectId: string;
  editId: string;
  tab: "edl" | "renders";
}) {
  const { navigate } = useApp();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [renders, setRenders] = useState<Render[]>([]);
  const [activeTab, setActiveTab] = useState<"edl" | "renders">(tab);
  const [loading, setLoading] = useState(true);
  const [generatingEdl, setGeneratingEdl] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [edlError, setEdlError] = useState("");
  const renderPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    const [editsData, clipsData, rendersData] = await Promise.all([
      rpcCall<{ edits: Edit[] }>("edits.list", { projectId }),
      rpcCall<{ clips: Clip[] }>("clips.list", { projectId }),
      rpcCall<{ renders: Render[] }>("edits.renders", { editId }),
    ]);
    const found = editsData.edits.find((e) => e.id === editId) ?? null;
    setEdit(found);
    setClips(clipsData.clips);
    setRenders(rendersData.renders);
  }, [projectId, editId]);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  // Poll renders if any are in-progress
  useEffect(() => {
    const hasActive = renders.some((r) => r.status === "rendering");
    if (hasActive && !renderPollRef.current) {
      renderPollRef.current = setInterval(async () => {
        try {
          const data = await rpcCall<{ renders: Render[] }>("edits.renders", { editId });
          setRenders(data.renders);
          if (!data.renders.some((r) => r.status === "rendering")) {
            clearInterval(renderPollRef.current!);
            renderPollRef.current = null;
          }
        } catch { /* ignore */ }
      }, 3000);
    }
    return () => {
      if (renderPollRef.current && !hasActive) {
        clearInterval(renderPollRef.current);
        renderPollRef.current = null;
      }
    };
  }, [renders, editId]);

  async function handleGenerateEdl() {
    setEdlError("");
    setGeneratingEdl(true);
    try {
      await rpcCall("edits.render", { editId });
      await loadAll();
    } catch (err) {
      if (err instanceof RpcError) {
        if (err.code === 3004) {
          setEdlError("EDL generation requires Gemini to be configured on the server.");
        } else {
          setEdlError(err.message);
        }
      }
    } finally {
      setGeneratingEdl(false);
    }
  }

  async function handleRenderVideo() {
    if (!edit?.timeline) return;
    setRendering(true);
    try {
      await rpcCall("edits.renderVideo", {
        editId,
        timeline: edit.timeline,
      });
      setActiveTab("renders");
      await loadAll();
      // Start polling
      if (!renderPollRef.current) {
        renderPollRef.current = setInterval(async () => {
          const data = await rpcCall<{ renders: Render[] }>("edits.renders", { editId });
          setRenders(data.renders);
          if (!data.renders.some((r) => r.status === "rendering")) {
            clearInterval(renderPollRef.current!);
            renderPollRef.current = null;
          }
        }, 3000);
      }
    } catch (err) {
      if (err instanceof RpcError) setEdlError(err.message);
    } finally {
      setRendering(false);
    }
  }

  if (loading) {
    return (
      <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }

  if (!edit) {
    return (
      <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        Edit not found.
      </div>
    );
  }

  const timeline = edit.timeline as TimelineEntry[] | null;
  const renderCount = renders.length;
  const hasActiveRender = renders.some((r) => r.status === "rendering");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate({ type: "edits", projectId })}
          className="text-[11px] cursor-pointer flex-shrink-0"
          style={{ color: "var(--color-navy-700)" }}
        >
          ← Back
        </button>
        <div className="text-[16px] font-medium flex-1 truncate" style={{ color: "var(--color-text)" }}>
          {edit.title}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleGenerateEdl}
            disabled={generatingEdl}
            className="text-[11px] px-3 py-1.5 rounded-md border cursor-pointer transition-colors"
            style={{
              borderColor: "var(--color-bone-50)",
              background: "var(--color-bone-0)",
              color: "var(--color-text-secondary)",
            }}
          >
            {generatingEdl ? "Generating…" : "Generate EDL"}
          </button>
          <button
            onClick={handleRenderVideo}
            disabled={rendering || !timeline || hasActiveRender}
            className="text-[11px] px-3 py-1.5 rounded-md cursor-pointer font-medium"
            style={{
              background: timeline ? "var(--color-success)" : "var(--color-bone-50)",
              color: timeline ? "white" : "var(--color-text-muted)",
            }}
          >
            {rendering ? "Starting…" : hasActiveRender ? "Rendering…" : "Render Video"}
          </button>
        </div>
      </div>

      {edlError && (
        <div
          className="text-[11px] px-3 py-2 rounded-md mb-3"
          style={{ background: "var(--color-error-subtle)", color: "var(--color-error)" }}
        >
          {edlError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b mb-4" style={{ borderColor: "var(--color-bone-50)" }}>
        <TabBtn label="EDL" active={activeTab === "edl"} onClick={() => setActiveTab("edl")} />
        <TabBtn
          label={`Renders${renderCount > 0 ? ` (${renderCount})` : ""}`}
          active={activeTab === "renders"}
          onClick={() => setActiveTab("renders")}
        />
      </div>

      {activeTab === "edl" ? (
        <EdlTab timeline={timeline} clips={clips} />
      ) : (
        <RendersTab renders={renders} />
      )}
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 text-[11px] font-medium border-b-2 transition-colors cursor-pointer"
      style={{
        borderBottomColor: active ? "var(--color-navy-700)" : "transparent",
        color: active ? "var(--color-navy-700)" : "var(--color-text-muted)",
      }}
    >
      {label}
    </button>
  );
}

// ─── EDL Tab ──────────────────────────────────────────────────

function EdlTab({ timeline, clips }: { timeline: TimelineEntry[] | null; clips: Clip[] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        No EDL yet. Use "Generate EDL" to build one from your footage.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: "var(--color-bone-50)", background: "var(--color-bone-0)" }}
    >
      {timeline.map((entry, i) => {
        const clip = clips.find((c) => c.id === entry.clip_id);
        return (
          <div
            key={i}
            className="px-4 py-3.5 border-b border-l-[3px]"
            style={{
              borderBottomColor: "var(--color-bone-50)",
              borderLeftColor: "var(--color-navy-700)",
              background: "transparent",
            }}
          >
            <div className="flex items-start gap-2 mb-1.5">
              <span
                className="text-[11px] font-semibold min-w-[20px]"
                style={{ color: "var(--color-navy-700)" }}
              >
                {i + 1}
              </span>
              <span className="text-[12px] font-medium flex-1" style={{ color: "var(--color-text)" }}>
                {entry.label}
              </span>
            </div>
            <div className="pl-7 text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-mono uppercase tracking-wide mr-1">Source</span>
              {clip ? clip.title || clip.filename : entry.clip_id}
              {entry.transition && (
                <>
                  {" · "}
                  <span className="font-mono uppercase tracking-wide mr-1">Transition</span>
                  {entry.transition.type} ({entry.transition.duration}s)
                </>
              )}
            </div>
            {entry.captions && entry.captions.length > 0 && (
              <div className="pl-7 mt-1.5 text-[11px] italic" style={{ color: "var(--color-text-secondary)" }}>
                {entry.captions.map((c, ci) => (
                  <div key={ci}>
                    {c.speaker && (
                      <span className="font-medium not-italic" style={{ color: "var(--color-navy-700)" }}>
                        {c.speaker}:{" "}
                      </span>
                    )}
                    "{c.text}"
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Renders Tab ──────────────────────────────────────────────

function RendersTab({ renders }: { renders: Render[] }) {
  if (renders.length === 0) {
    return (
      <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        No renders yet. Build an EDL and click "Render Video".
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {renders.map((render) => (
        <RenderRow key={render.id} render={render} />
      ))}
    </div>
  );
}

function RenderRow({ render }: { render: Render }) {
  const filename = `${render.id.slice(0, 8)}.mp4`;
  const date = render.completedAt
    ? new Date(render.completedAt).toLocaleString()
    : new Date(render.createdAt).toLocaleString();

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg border"
      style={{ background: "var(--color-bone-0)", borderColor: "var(--color-bone-50)" }}
    >
      <div
        className="w-16 h-10 rounded flex-shrink-0"
        style={{ background: "var(--color-navy-700)" }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>
          {filename}
        </div>
        <div className="text-[12px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {date}
          {render.errorMessage && (
            <span style={{ color: "var(--color-error)" }}> · {render.errorMessage}</span>
          )}
        </div>
      </div>
      {render.status === "rendering" && (
        <span className="text-[12px] font-mono" style={{ color: "var(--color-warning)" }}>
          Rendering…
        </span>
      )}
      {render.status === "done" && render.videoUrl && (
        <a
          href={render.videoUrl}
          className="text-[11px] cursor-pointer"
          style={{ color: "var(--color-navy-700)" }}
          download
        >
          ↓ Download
        </a>
      )}
      {render.status === "error" && (
        <span className="text-[12px]" style={{ color: "var(--color-error)" }}>Error</span>
      )}
    </div>
  );
}
