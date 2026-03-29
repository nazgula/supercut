import { useState, useEffect, useRef, useCallback } from "react";
import { rpcCall, getAuthToken, refreshAccessToken, API_BASE } from "../../api/rpc";
import { cachedRpcCall } from "../../api/cachedRpc";
import { useApp } from "../../context/AppContext";
import { MaterialItem } from "../ui/MaterialItem";
import type { MaterialItemData } from "../ui/MaterialItem";

const SCRIPT_EXTENSIONS = new Set(["txt", "fountain", "fdx"]);

// ─── Types ────────────────────────────────────────────────────

export interface Shot {
  id: string;
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  thumbnailPath: string | null;
  transcript: { text: string; words: unknown[]; segments: unknown[] } | null;
}

export interface Clip {
  id: string;
  title: string;
  filename: string;
  mediaUrl: string;
  duration: number | null;
  status: "processing" | "ready" | "error";
  errorMessage: string | null;
  mediaType: "video" | "image" | "audio";
  shots: Shot[];
  createdAt: string;
  updatedAt: string;
}

type MediaTypeFilter = "video" | "image" | "audio";

const TABS: Array<{ type: MediaTypeFilter; label: string }> = [
  { type: "video", label: "Video" },
  { type: "image", label: "Images" },
  { type: "audio", label: "Audio" },
];

function formatDuration(secs: number | null): string {
  if (secs == null) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function clipToItemData(clip: Clip): MaterialItemData {
  const flag =
    clip.status === "error"
      ? { label: "Error", severity: "bad" as const }
      : undefined;

  return {
    type: clip.mediaType === "image" ? "image" : clip.mediaType === "audio" ? "audio" : "video",
    title: clip.status === "processing" ? clip.filename : clip.title || clip.filename,
    duration: clip.status === "processing" ? "Processing…" : formatDuration(clip.duration),
    meta: clip.status === "error" ? (clip.errorMessage ?? "Processing failed") : undefined,
    thumbnail: true,
    flag,
  };
}

// ─── Component ────────────────────────────────────────────────

export function MaterialsPage({ projectId }: { projectId: string }) {
  const { navigate } = useApp();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MediaTypeFilter>("video");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadClips = useCallback(async () => {
    try {
      const data = await cachedRpcCall<{ clips: Clip[]; postProcessing: boolean }>(
        "clips.list",
        { projectId }
      );
      setClips(data.clips);
      // Notify ChatColumn log rail of clip state changes
      window.dispatchEvent(new CustomEvent("supercut:clips-update", { detail: data.clips }));
      // Stop polling when nothing is processing
      const anyProcessing =
        data.postProcessing || data.clips.some((c) => c.status === "processing");
      if (!anyProcessing && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch {
      // silently fail polls
    }
  }, [projectId]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadClips().finally(() => setLoading(false));
  }, [loadClips]);

  // Start/stop polling when processing state changes
  useEffect(() => {
    const anyProcessing = clips.some((c) => c.status === "processing");
    if (anyProcessing && !pollRef.current) {
      pollRef.current = setInterval(loadClips, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [clips, loadClips]);

  async function uploadFiles(files: FileList | File[]) {
    setUploading(true);
    setUploadError(null);
    const errors: string[] = [];
    let scriptDetected = false;
    try {
      for (const file of Array.from(files)) {
        // Check for script file
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (SCRIPT_EXTENSIONS.has(ext)) {
          try {
            const text = await file.text();
            if (text.trim()) {
              await rpcCall("projects.updateScript", { projectId, script: text });
              scriptDetected = true;
              window.dispatchEvent(new CustomEvent("supercut:script-detected", { detail: { filename: file.name } }));
            }
          } catch {
            errors.push(`${file.name}: failed to save as script`);
          }
          continue; // Don't upload script files as media
        }

        const form = new FormData();
        form.append("file", file);
        form.append("projectId", projectId);
        try {
          let res = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
            body: form,
          });
          if (res.status === 401) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              res = await fetch(`${API_BASE}/upload`, {
                method: "POST",
                headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
                body: form,
              });
            }
          }
          if (!res.ok) {
            let msg = `${file.name}: upload failed (${res.status})`;
            try {
              const body = await res.json() as { message?: string; error?: string };
              if (body.message || body.error) msg = `${file.name}: ${body.message ?? body.error}`;
            } catch { /* non-JSON response */ }
            errors.push(msg);
          }
        } catch {
          errors.push(`${file.name}: network error`);
        }
      }
      if (errors.length > 0) {
        setUploadError(errors.join(" · "));
      }
      await loadClips();
      // Navigate to Script page if a script was detected in the upload batch
      if (scriptDetected) {
        navigate({ type: "script", projectId });
      }
      // Start polling since new clips may be processing
      if (!pollRef.current) {
        pollRef.current = setInterval(loadClips, 3000);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleReprocess(clipId: string) {
    try {
      await rpcCall("clips.reprocess", { projectId, clipId });
      await loadClips();
      if (!pollRef.current) {
        pollRef.current = setInterval(loadClips, 3000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to reprocess clip";
      setUploadError(msg);
    }
  }

  const filtered = clips.filter((c) => c.mediaType === activeTab);
  const countByType = (t: MediaTypeFilter) => clips.filter((c) => c.mediaType === t).length;
  const hasClips = clips.length > 0;

  return (
    <div>
      {/* Type tabs */}
      <div
        className="flex rounded-lg overflow-hidden border mb-4"
        style={{ background: "var(--color-bone-0)", borderColor: "var(--color-bone-50)" }}
      >
        {TABS.map((tab, i) => {
          const count = countByType(tab.type);
          const isActive = activeTab === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setActiveTab(tab.type)}
              className="flex-1 py-3 px-4 text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              style={{
                background: isActive ? "var(--color-bone-25)" : "transparent",
                color: isActive ? "var(--color-text)" : "var(--color-text-muted)",
                borderRight: i < TABS.length - 1 ? "1px solid var(--color-bone-50)" : "none",
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className="text-[12px] font-mono"
                  style={{ color: "var(--color-accent)" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upload zone */}
      <div
        className={[
          "border-2 border-dashed rounded-xl transition-colors cursor-pointer mb-5",
          hasClips ? "p-4" : "p-10 text-center",
        ].join(" ")}
        style={{
          borderColor: dragOver ? "var(--color-navy-500)" : "var(--color-bone-50)",
          background: dragOver ? "var(--color-bone-0)" : "transparent",
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
      >
        {hasClips ? (
          <span className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>
            {uploading ? "Uploading…" : "+ Add more files"}
          </span>
        ) : (
          <>
            <div className="text-2xl mb-2.5" style={{ color: "var(--color-text-muted)" }}>↑</div>
            <div className="text-[12px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              {uploading ? "Uploading…" : "Drop files here or click to browse"}
            </div>
            <div className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
              Video, audio, and image files supported
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*,audio/*"
          className="hidden"
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); }}
        />
      </div>

      {/* Upload error */}
      {uploadError && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-lg mb-4 text-[11px]"
          style={{ background: "var(--color-error-subtle)", color: "var(--color-error)" }}
        >
          <span className="flex-1">{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="flex-shrink-0 cursor-pointer opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Material list */}
      {loading ? (
        <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          No {activeTab} files yet
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((clip) => (
            <div key={clip.id}>
              <div
                className={clip.status === "ready" ? "cursor-pointer" : ""}
                onClick={() =>
                  clip.status === "ready"
                    ? navigate({ type: "material-detail", projectId, clipId: clip.id })
                    : undefined
                }
              >
                <MaterialItem {...clipToItemData(clip)} />
              </div>

              {/* Error details + reprocess */}
              {clip.status === "error" && (
                <div
                  className="flex items-start gap-2 px-4 py-2 ml-[3px] border-l-[3px] rounded-b-md text-[12px]"
                  style={{
                    borderColor: "var(--color-error)",
                    background: "var(--color-error-subtle)",
                    color: "var(--color-error)",
                  }}
                >
                  <span className="flex-1">{clip.errorMessage || "Processing failed"}</span>
                  <button
                    onClick={() => handleReprocess(clip.id)}
                    className="flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors"
                    style={{
                      background: "var(--color-error)",
                      color: "white",
                    }}
                  >
                    Reprocess
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
