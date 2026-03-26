import { Button } from "./Button";

type MaterialType = "video" | "audio" | "image";

interface PreviewItem {
  type: MaterialType;
  name: string;
}

interface SuggestionCardProps {
  text: string;
  confidence?: number;
  preview?: PreviewItem[];
  onApply?: () => void;
  onEdit?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const typeColor: Record<MaterialType, string> = {
  video: "bg-type-video",
  audio: "bg-type-audio",
  image: "bg-type-image",
};

export function SuggestionCard({
  text,
  confidence,
  preview,
  onApply,
  onEdit,
  onDismiss,
  className = "",
}: SuggestionCardProps) {
  return (
    <div
      className={[
        "bg-surface border border-border-light rounded-md p-4 shadow-[0_2px_8px_rgba(30,51,64,0.04)]",
        className,
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-[12px] flex-shrink-0">
          ✦
        </span>
        <span className="text-[11px] font-semibold text-accent uppercase tracking-[0.04em]">
          Suggestion
        </span>
        {confidence !== undefined && (
          <span className="ml-auto text-[12px] font-mono text-text-muted">
            {confidence}% confidence
          </span>
        )}
      </div>

      {/* Body */}
      <p className="text-[14px] text-text-secondary mb-3 leading-relaxed">
        {text}
      </p>

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="flex flex-wrap gap-2 bg-bg rounded-sm px-3 py-2 mb-3">
          {preview.map((item) => (
            <span
              key={item.name}
              className="flex items-center gap-1 text-[11px] font-mono text-text-secondary"
            >
              <span
                className={["w-2 h-2 rounded-[2px] flex-shrink-0", typeColor[item.type]].join(" ")}
              />
              {item.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {onApply && (
          <Button variant="accent" size="sm" onClick={onApply}>
            Apply
          </Button>
        )}
        {onEdit && (
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
