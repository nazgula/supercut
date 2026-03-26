import type { ReactNode } from "react";

interface ChatBubbleProps {
  role: "user" | "ai";
  label?: string;
  children: ReactNode;
  className?: string;
}

export function ChatBubble({
  role,
  label,
  children,
  className = "",
}: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={[
        "max-w-[85%] px-4 py-3",
        isUser
          ? "ml-auto bg-slate-400 text-text-on-dark rounded-md rounded-br-[4px]"
          : "mr-auto bg-surface-2 border border-border text-text rounded-md rounded-bl-[4px]",
        className,
      ].join(" ")}
    >
      {label && (
        <div
          className={[
            "text-[12px] font-mono uppercase tracking-wider mb-1",
            isUser ? "text-text-on-dark-sec" : "text-text-muted",
          ].join(" ")}
        >
          {label}
        </div>
      )}
      <p className="text-[16px] leading-relaxed">{children}</p>
    </div>
  );
}
