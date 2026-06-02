import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-[var(--control-height)] w-full rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--card)] px-3 text-sm text-stone-950 outline-none transition focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
