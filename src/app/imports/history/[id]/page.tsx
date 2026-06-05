import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getImportBatch, listImportBatchIssues } from "@/lib/data/import-batches";
import type { ImportBatch, ImportBatchIssue } from "@/lib/types";

export const dynamic = "force-dynamic";

const importTypeLabels: Record<ImportBatch["import_type"], string> = {
  products: "商品",
  inventory: "库存",
  purchases: "采购",
  recipes: "配方",
  orders: "订单",
};

const severityMeta: Record<ImportBatchIssue["severity"], { label: string; badge: "danger" | "warning" | "muted"; icon: typeof AlertTriangle }> = {
  error: { label: "错误", badge: "danger", icon: AlertTriangle },
  warning: { label: "预警", badge: "warning", icon: AlertTriangle },
  info: { label: "信息", badge: "muted", icon: Info },
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ImportBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");
  const { id } = await params;
  const [batch, issues] = await Promise.all([getImportBatch(id), listImportBatchIssues(id)]);

  if (!batch) notFound();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="导入批次详情"
        description={`${formatTime(batch.created_at)} / ${importTypeLabels[batch.import_type]} / ${batch.source_file}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/imports/readiness">试运行看板</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/imports/history">返回历史</Link>
            </Button>
          </div>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-5">
        <Summary label="状态" value={batch.status === "completed" ? "已完成" : "失败"} tone={batch.status === "completed" ? "success" : "danger"} />
        <Summary label="总行数" value={`${batch.total_rows}`} />
        <Summary label="入库数" value={`${batch.imported_rows}`} />
        <Summary label="跳过数" value={`${batch.skipped_rows}`} />
        <Summary label="预警数" value={`${batch.warning_count}`} tone={batch.warning_count > 0 ? "warning" : "default"} />
      </section>

      {batch.error_message ? (
        <Card className="mb-5 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-950">失败原因</CardTitle>
            <CardDescription className="text-red-800">{batch.error_message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>异常明细</CardTitle>
          <CardDescription>这里记录每次导入需要处理的缺失项、单位错误、重复订单和预警信息。</CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="暂无异常明细"
              description="如果这是旧批次或尚未执行最新 migration，可能只有批次摘要；新导入会开始记录结构化明细。"
            />
          ) : (
            <TableContainer>
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>级别</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>对象</TableHead>
                    <TableHead>行号</TableHead>
                    <TableHead>处理说明</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => {
                    const meta = severityMeta[issue.severity];
                    const Icon = meta.icon;
                    return (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <Badge variant={meta.badge}>
                            <Icon className="mr-1 h-3.5 w-3.5" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-stone-600">{issue.issue_type}</TableCell>
                        <TableCell className="font-medium">{issue.entity_name}</TableCell>
                        <TableCell className="text-stone-500">{issue.row_no ?? "-"}</TableCell>
                        <TableCell className="text-stone-700">{issue.message}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Summary({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-stone-950",
    success: "text-emerald-800",
    warning: "text-amber-700",
    danger: "text-red-700",
  }[tone];

  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
