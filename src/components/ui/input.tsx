import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-[var(--control-height)] w-full rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--card)] px-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[var(--accent)] focus:bg-white focus:ring-2 focus:ring-[var(--accent)]/15",
        className,
      )}
      {...props}
    />
  );
}
