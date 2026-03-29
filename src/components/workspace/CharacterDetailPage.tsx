import { useState, useEffect, useRef } from "react";
import { rpcCall, authUrl } from "../../api/rpc";
import { cachedRpcCall } from "../../api/cachedRpc";
import { useApp } from "../../context/AppContext";
import type { FaceGroup } from "./CharactersPage";

interface Appearance {
  clipId: string;
  clipTitle: string;
  videoUrl: string;
  clipDuration: number;
  ranges: Array<{ start: number; end: number; bestFrameUrl: string | null }>;
}

function formatTC(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CharacterDetailPage({
  projectId,
  groupId,
}: {
  projectId: string;
  groupId: string;
}) {
  const { navigate } = useApp();
  const [group, setGroup] = useState<FaceGroup | null>(null);
  const [appearances, setAppearances] = useState<Appearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      cachedRpcCall<{ groups: FaceGroup[] }>("faces.list", { projectId }),
      cachedRpcCall<{ clips: Appearance[] }>("faces.appearances", { projectId, groupId }),
    ])
      .then(([groupsData, appData]) => {
        const found = groupsData.groups.find((g) => g.id === groupId) ?? null;
        setGroup(found);
        if (found) setNameValue(found.nickname || found.label);
        setAppearances(appData.clips);
      })
      .finally(() => setLoading(false));
  }, [projectId, groupId]);

  async function handleRename() {
    if (!group) return;
    const name = nameValue.trim();
    if (!name || name === (group.nickname || group.label)) {
      setEditingName(false);
      return;
    }
    await rpcCall("faces.rename", { projectId, groupId, label: name, nickname: name });
    setGroup({ ...group, nickname: name, label: name });
    setEditingName(false);
  }

  if (loading) {
    return (
      <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        Character not found.
      </div>
    );
  }

  const displayName = group.nickname || group.label;

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate({ type: "characters", projectId })}
        className="text-[11px] mb-4 cursor-pointer block"
        style={{ color: "var(--color-navy-700)" }}
      >
        ← Back to Characters
      </button>

      {/* Profile header */}
      <div className="flex gap-4 mb-5">
        <div
          className="w-[100px] h-[100px] rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden"
          style={{ background: "var(--color-bone-25)" }}
        >
          {group.imageUrl ? (
            <img src={authUrl(group.imageUrl)} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl opacity-30">👤</span>
          )}
        </div>
        <div className="flex-1">
          {editingName ? (
            <input
              ref={nameInputRef}
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") { setEditingName(false); setNameValue(displayName); }
              }}
              onBlur={handleRename}
              className="text-[18px] font-medium w-full rounded px-1 outline-none border-b"
              style={{
                color: "var(--color-text)",
                borderColor: "var(--color-accent)",
                background: "transparent",
              }}
            />
          ) : (
            <div
              className="text-[18px] font-medium mb-1 cursor-pointer hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-text)" }}
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {displayName}
            </div>
          )}
          {group.label !== displayName && (
            <div className="text-[11px] mb-1" style={{ color: "var(--color-text-muted)" }}>
              {group.label}
            </div>
          )}
          {group.description && (
            <div className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {group.description}
            </div>
          )}
        </div>
      </div>

      {/* Appearances */}
      <div
        className="text-[11px] font-medium mb-3 uppercase tracking-[0.06em]"
        style={{ color: "var(--color-text-muted)" }}
      >
        Appearances
      </div>

      {appearances.length === 0 ? (
        <div className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
          No appearances found.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {appearances.flatMap((app) =>
            app.ranges.map((range, i) => (
              <div
                key={`${app.clipId}-${i}`}
                className="flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors"
                style={{
                  background: "var(--color-bone-0)",
                  borderColor: "var(--color-bone-50)",
                }}
                onClick={() =>
                  navigate({ type: "material-detail", projectId, clipId: app.clipId })
                }
              >
                <div
                  className="w-12 h-8 rounded flex-shrink-0 overflow-hidden"
                  style={{ background: "var(--color-navy-700)" }}
                >
                  {range.bestFrameUrl && (
                    <img
                      src={range.bestFrameUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate" style={{ color: "var(--color-text)" }}>
                    {app.clipTitle}
                  </div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {formatTC(range.start)} – {formatTC(range.end)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
