import { useState, useEffect } from "react";
import { cachedRpcCall } from "../../api/cachedRpc";
import { API_BASE, getAuthToken } from "../../api/rpc";
import { useApp } from "../../context/AppContext";
import type { Clip, Shot } from "./MaterialsPage";

/** Fetch a presigned URL for a media file by following the auth redirect */
async function getPresignedMediaUrl(mediaUrl: string): Promise<string | null> {
  if (!mediaUrl) return null;
  try {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}${mediaUrl}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      redirect: "manual",
    });
    // Backend returns 302 with Location header pointing to presigned S3 URL
    if (res.status === 302 || res.status === 301) {
      return res.headers.get("Location");
    }
    // If redirect was followed automatically (browser), the final URL is the presigned one
    if (res.ok && res.url !== `${API_BASE}${mediaUrl}`) {
      return res.url;
    }
    return null;
  } catch {
    return null;
  }
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

export function MaterialDetailPage({
  projectId,
  clipId,
}: {
  projectId: string;
  clipId: string;
}) {
  const { navigate } = useApp();
  const [clip, setClip] = useState<Clip | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"shots" | "transcript">("shots");

  useEffect(() => {
    let cancelled = false;
    cachedRpcCall<{ clips: Clip[] }>("clips.list", { projectId })
      .then(async (data) => {
        if (cancelled) return;
        const found = data.clips.find((c) => c.id === clipId) ?? null;
        setClip(found);
        if (found?.mediaUrl) {
          const url = await getPresignedMediaUrl(found.mediaUrl);
          if (!cancelled) setResolvedUrl(url);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, clipId]);

  if (loading) {
    return (
      <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }

  if (!clip) {
    return (
      <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        Clip not found.
      </div>
    );
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "var(--color-bone-0)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ borderColor: "var(--color-bone-50)" }}
      >
        <button
          onClick={() => navigate({ type: "materials", projectId })}
          className="text-[11px] cursor-pointer"
          style={{ color: "var(--color-navy-700)" }}
        >
          ← Back
        </button>
        <span className="text-[16px] font-medium flex-1 truncate" style={{ color: "var(--color-text)" }}>
          {clip.title || clip.filename}
        </span>
        {clip.duration != null && (
          <span className="text-[11px] font-mono flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
            {Math.floor(clip.duration / 60)}:{String(Math.floor(clip.duration % 60)).padStart(2, "0")}
          </span>
        )}
      </div>

      {/* Media player */}
      {resolvedUrl && clip.mediaType === "video" ? (
        <video
          src={resolvedUrl}
          controls
          className="w-full"
          style={{ background: "#000", maxHeight: "400px" }}
        />
      ) : resolvedUrl && clip.mediaType === "audio" ? (
        <div className="px-4 py-6" style={{ background: "var(--color-navy-900)" }}>
          <audio src={resolvedUrl} controls className="w-full" />
        </div>
      ) : resolvedUrl && clip.mediaType === "image" ? (
        <img
          src={resolvedUrl}
          alt={clip.title || clip.filename}
          className="w-full"
          style={{ maxHeight: "400px", objectFit: "contain", background: "#000" }}
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ background: "var(--color-navy-900)", aspectRatio: "16/9" }}
        >
          <span className="text-[14px]" style={{ color: "var(--color-text-muted)" }}>
            {loading ? "Loading…" : "Media unavailable"}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--color-bone-50)" }}>
        {(["shots", "transcript"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-[11px] font-medium border-b-2 transition-colors cursor-pointer capitalize"
            style={{
              borderBottomColor: activeTab === tab ? "var(--color-navy-700)" : "transparent",
              color: activeTab === tab ? "var(--color-navy-700)" : "var(--color-text-muted)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="p-4 max-h-[360px] overflow-y-auto">
        {activeTab === "shots" ? (
          <ShotsTab shots={clip.shots} />
        ) : (
          <TranscriptTab shots={clip.shots} />
        )}
      </div>
    </div>
  );
}

function ShotsTab({ shots }: { shots: Shot[] }) {
  if (shots.length === 0) {
    return (
      <div className="text-[12px] py-4" style={{ color: "var(--color-text-muted)" }}>
        No shots detected.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {shots.map((shot) => (
        <div
          key={shot.id}
          className="p-3 rounded-md border"
          style={{ borderColor: "var(--color-bone-50)" }}
        >
          <div className="text-[12px] font-medium mb-1" style={{ color: "var(--color-text)" }}>
            {shot.title}
          </div>
          {shot.description && (
            <div className="text-[11px] mb-1.5 leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {shot.description}
            </div>
          )}
          <div className="text-[12px] font-mono" style={{ color: "var(--color-text-muted)" }}>
            {formatTime(shot.startTime)} → {formatTime(shot.endTime)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TranscriptTab({ shots }: { shots: Shot[] }) {
  const fullText = shots
    .map((s) => s.transcript?.text)
    .filter(Boolean)
    .join("\n\n");

  if (!fullText) {
    return (
      <div className="text-[12px] py-4" style={{ color: "var(--color-text-muted)" }}>
        No transcript available.
      </div>
    );
  }

  return (
    <div
      className="text-[12px] leading-relaxed whitespace-pre-wrap"
      style={{ color: "var(--color-text)" }}
    >
      {fullText}
    </div>
  );
}
