import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

const variantClasses = {
  primary:
    "bg-navy-700 text-text-on-dark hover:bg-navy-600 disabled:opacity-50",
  accent:
    "bg-accent text-white hover:bg-accent-hover disabled:opacity-50",
  secondary:
    "bg-transparent text-text-secondary border border-border-strong hover:bg-surface-2 disabled:opacity-40",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-2 disabled:opacity-40",
  danger:
    "bg-error text-white hover:opacity-90 disabled:opacity-50",
};

const sizeClasses = {
  sm: "h-8 px-3 text-[14px]",
  md: "h-9 px-4 text-[14px]",
  lg: "h-11 px-6 text-[16px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors cursor-pointer select-none",
        "focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
