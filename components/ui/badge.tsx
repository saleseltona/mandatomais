import * as React from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "emerald" | "navy" | "neutral";

const variantClasses: Record<BadgeVariant, string> = {
  emerald: "bg-brand-emerald-soft text-brand-emerald",
  navy: "bg-surface-muted text-brand-navy",
  neutral: "bg-surface-muted text-ink-secondary",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
