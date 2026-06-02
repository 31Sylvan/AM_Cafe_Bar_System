import { cn } from "@/lib/utils";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs font-medium text-stone-700",
        className,
      )}
    >
      {children}
    </span>
  );
}
