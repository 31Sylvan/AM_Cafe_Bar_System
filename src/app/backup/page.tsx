import Link from "next/link";
import { Download, FileJson } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission, requireProfile } from "@/lib/auth";
import { backupReports } from "@/lib/backup";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  const profile = await requireProfile();
  requirePermission(profile, "backup.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="数据备份中心"
        description="集中下载关键经营数据，也提供 JSON 清单给自动备份脚本使用。"
        action={
          <Button asChild variant="secondary">
            <Link href="/api/backup/manifest" prefetch={false}>
              <FileJson className="h-4 w-4" />
              备份清单
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {backupReports.map((report) => (
          <section key={report.key} className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{report.name}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">{report.description}</p>
              </div>
              {report.ownerOnly ? <Badge>老板</Badge> : <Badge>通用</Badge>}
            </div>
            <Button asChild className="mt-4 w-full" variant="secondary">
              <Link href={report.href} prefetch={false}>
                <Download className="h-4 w-4" />
                下载 CSV
              </Link>
            </Button>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
