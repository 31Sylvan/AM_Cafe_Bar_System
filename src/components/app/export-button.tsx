import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton({ report, label = "导出 CSV" }: { report: string; label?: string }) {
  return (
    <Button asChild variant="secondary" size="sm">
      <Link href={`/api/export/${report}`} prefetch={false}>
        <Download className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}
