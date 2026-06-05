import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton({
  report,
  label = "导出 CSV",
  query,
}: {
  report: string;
  label?: string;
  query?: Record<string, string | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value) params.set(key, value);
  }
  const href = `/api/export/${report}${params.size > 0 ? `?${params.toString()}` : ""}`;

  return (
    <Button asChild variant="secondary" size="sm">
      <Link href={href} prefetch={false}>
        <Download className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
