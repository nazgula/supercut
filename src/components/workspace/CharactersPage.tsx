import { useState, useEffect } from "react";
import { rpcCall } from "../../api/rpc";
import { cachedRpcCall } from "../../api/cachedRpc";
import { useApp } from "../../context/AppContext";

export interface FaceGroup {
  id: string;
  label: string;
  nickname: string;
  description: string;
  imageUrl: string | null;
  detectionCount: number;
  clipIds: string[];
}

export function CharactersPage({ projectId }: { projectId: string }) {
  const { navigate } = useApp();
  const [groups, setGroups] = useState<FaceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [reclustering, setReclustering] = useState(false);

  async function load() {
    try {
      const data = await cachedRpcCall<{ groups: FaceGroup[] }>("faces.list", { projectId });
      setGroups(data.groups);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleRecluster() {
    setReclustering(true);
    try {
      await rpcCall("faces.recluster", { projectId });
      await load();
    } finally {
      setReclustering(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[16px] font-medium" style={{ color: "var(--color-text)" }}>
          Characters
        </div>
        <button
          onClick={handleRecluster}
          disabled={reclustering}
          className="text-[11px] px-3 py-1.5 rounded-md border cursor-pointer transition-colors"
          style={{
            borderColor: "var(--color-bone-50)",
            background: "var(--color-bone-0)",
            color: "var(--color-text-secondary)",
          }}
        >
          {reclustering ? "Scanning…" : "Re-scan All Clips"}
        </button>
      </div>

      {loading ? (
        <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          Loading…
        </div>
      ) : groups.length === 0 ? (
        <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          No characters detected yet. Upload footage to detect faces.
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
        >
          {groups.map((group) => (
            <CharacterCard
              key={group.id}
              group={group}
              onClick={() =>
                navigate({ type: "character-detail", projectId, groupId: group.id })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterCard({
  group,
  onClick,
}: {
  group: FaceGroup;
  onClick: () => void;
}) {
  const displayName = group.nickname || group.label;

  return (
    <button
      onClick={onClick}
      className="rounded-lg overflow-hidden border text-left cursor-pointer transition-colors"
      style={{
        background: "var(--color-bone-0)",
        borderColor: "var(--color-bone-50)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="w-full flex items-center justify-center"
        style={{
          aspectRatio: "1",
          background: group.imageUrl ? undefined : "var(--color-bone-25)",
        }}
      >
        {group.imageUrl ? (
          <img src={group.imageUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl opacity-30">👤</span>
        )}
      </div>
      {/* Info */}
      <div className="p-2.5">
        <div className="text-[12px] font-medium truncate" style={{ color: "var(--color-text)" }}>
          {displayName}
        </div>
        <div className="text-[9px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Seen in {group.clipIds.length} clip{group.clipIds.length !== 1 ? "s" : ""}
        </div>
      </div>
    </button>
  );
}
