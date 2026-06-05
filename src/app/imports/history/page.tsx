import Link from "next/link";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission, requireProfile } from "@/lib/auth";
import { listImportBatches } from "@/lib/data/import-batches";
import type { ImportBatch } from "@/lib/types";

export const dynamic = "force-dynamic";

const importTypeLabels: Record<ImportBatch["import_type"], string> = {
  products: "商品",
  inventory: "库存",
  purchases: "采购",
  recipes: "配方",
  orders: "订单",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ImportHistoryPage() {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");
  const batches = await listImportBatches();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="导入批次历史"
        description="追踪真实数据导入结果，确认每次上传是否完成入库、跳过了多少记录，以及是否存在预警。"
        action={
          <Button asChild variant="secondary">
            <Link href="/imports">返回导入中心</Link>
          </Button>
        }
      />

      {batches.length === 0 ? (
        <EmptyState title="暂无导入批次" description="完成一次商品、库存、采购、配方或订单导入后，这里会出现导入审计记录。" />
      ) : (
        <TableContainer>
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>来源文件</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">总行数</TableHead>
                <TableHead className="text-right">入库数</TableHead>
                <TableHead className="text-right">跳过数</TableHead>
                <TableHead className="text-right">预警</TableHead>
                <TableHead>错误信息</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="whitespace-nowrap text-stone-600">{formatTime(batch.created_at)}</TableCell>
                  <TableCell>
                    <Badge>{importTypeLabels[batch.import_type]}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate font-medium">
                    <Link href={`/imports/history/${batch.id}`} className="text-emerald-700 hover:underline">
                      {batch.source_file}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={batch.status === "completed" ? "success" : "danger"}>
                      {batch.status === "completed" ? "已完成" : "失败"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{batch.total_rows}</TableCell>
                  <TableCell className="text-right tabular-nums">{batch.imported_rows}</TableCell>
                  <TableCell className="text-right tabular-nums">{batch.skipped_rows}</TableCell>
                  <TableCell className="text-right tabular-nums">{batch.warning_count}</TableCell>
                  <TableCell className="max-w-[360px] truncate text-stone-600">
                    {batch.error_message ? (
                      <Link href={`/imports/history/${batch.id}`} className="hover:text-stone-950 hover:underline">
                        {batch.error_message}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AppShell>
  );
}
