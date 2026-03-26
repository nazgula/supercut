// Base types shared across the material system
export type MaterialType = "video" | "audio" | "image" | "brand";
export type FlagSeverity = "partial" | "bad";

export interface FlagData {
  label: string;
  severity: FlagSeverity;
}

export interface MaterialItemData {
  type: MaterialType;
  title: string;
  duration?: string;
  meta?: string;
  thumbnail?: boolean;
  flag?: FlagData;
}

// ─── Shared lookup tables ────────────────────────────────────

const typeBorderColor: Record<MaterialType, string> = {
  video: "var(--color-type-video)",
  audio: "var(--color-type-audio)",
  image: "var(--color-type-image)",
  brand: "var(--color-type-brand)",
};

const thumbGradient: Record<MaterialType, string> = {
  video: "linear-gradient(135deg, var(--color-navy-700), var(--color-slate-500))",
  audio: "linear-gradient(135deg, var(--color-slate-500), var(--color-slate-300))",
  image: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))",
  brand: "linear-gradient(135deg, var(--color-slate-300), var(--color-bone-200))",
};

const thumbSymbol: Record<MaterialType, string> = {
  video: "▶",
  audio: "♫",
  image: "◼",
  brand: "★",
};

const flagClasses: Record<FlagSeverity, string> = {
  partial: "bg-warning-subtle text-warning",
  bad:     "bg-error-subtle text-error",
};

// ─── MaterialItem ────────────────────────────────────────────

interface MaterialItemProps extends MaterialItemData {
  className?: string;
}

export function MaterialItem({
  type,
  title,
  duration,
  meta,
  thumbnail = false,
  flag,
  className = "",
}: MaterialItemProps) {
  const borderColor = typeBorderColor[type];

  if (thumbnail) {
    return (
      <div
        className={[
          "grid grid-cols-[64px_1fr] gap-3 border border-border rounded-md p-2",
          "transition-shadow hover:shadow-[0_2px_8px_rgba(30,51,64,0.06)]",
          className,
        ].join(" ")}
        style={{ borderLeftColor: borderColor, borderLeftWidth: "3px" }}
      >
        {/* Thumbnail */}
        <div
          className="w-16 h-11 rounded flex items-center justify-center text-[12px] font-mono text-text-on-dark-sec flex-shrink-0"
          style={{ background: thumbGradient[type] }}
        >
          {thumbSymbol[type]} {duration}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
            <span className="text-xs font-medium text-text truncate" title={title}>{title}</span>
            {flag && (
              <span className={["text-[9px] font-semibold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-[3px] flex-shrink-0", flagClasses[flag.severity]].join(" ")}>
                {flag.label}
              </span>
            )}
          </div>
          {meta && <span className="text-[11px] text-text-secondary">{meta}</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "border border-border rounded-md px-4 py-3",
        "transition-shadow hover:shadow-[0_2px_8px_rgba(30,51,64,0.06)]",
        className,
      ].join(" ")}
      style={{ borderLeftColor: borderColor, borderLeftWidth: "3px" }}
    >
      <div className="flex items-center gap-2 mb-1 min-w-0">
        <span className="text-xs font-medium text-text flex-1 truncate" title={title}>{title}</span>
        {flag && (
          <span className={["text-[9px] font-semibold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-[3px] flex-shrink-0", flagClasses[flag.severity]].join(" ")}>
            {flag.label}
          </span>
        )}
        {duration && (
          <span className="text-[11px] font-mono text-text-muted flex-shrink-0">{duration}</span>
        )}
      </div>
      {meta && <span className="text-[11px] text-text-secondary">{meta}</span>}
    </div>
  );
}

// ─── MaterialStrip ───────────────────────────────────────────
// Compact inline row used inside EDL groups

export interface MaterialStripData {
  type: MaterialType;
  name: string;
  role: string;
  timecode?: string;
  flag?: FlagData;
}

const stripFlagBg: Record<FlagSeverity, string> = {
  partial: "#FEFBF5",
  bad:     "#FEF6F5",
};

export function MaterialStrip({ type, name, role, timecode, flag }: MaterialStripData) {
  const borderColor = flag?.severity === "bad"
    ? "var(--color-error)"
    : flag?.severity === "partial"
    ? "var(--color-warning)"
    : typeBorderColor[type];

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 rounded-[4px]"
      style={{
        borderLeft: `3px solid ${borderColor}`,
        background: flag ? stripFlagBg[flag.severity] : "var(--color-bone-25)",
      }}
    >
      <span className="text-[11px] text-text-secondary flex-1 truncate">{name}</span>
      <span className="text-[9px] font-mono uppercase tracking-[0.05em] text-text-muted px-1.5 py-0.5 bg-surface rounded-[3px] flex-shrink-0">
        {role}
      </span>
      {flag && (
        <span className={["text-[8px] font-semibold uppercase px-1 py-0.5 rounded-[2px] flex-shrink-0", flagClasses[flag.severity]].join(" ")}>
          {flag.label}
        </span>
      )}
      {timecode && !flag && (
        <span className="text-[12px] font-mono text-text-muted flex-shrink-0">{timecode}</span>
      )}
    </div>
  );
}
