import Link from "next/link";
import { AlertTriangle, CheckCircle2, CircleDotDashed, UploadCloud } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getImportReadiness, type ImportReadinessCheck } from "@/lib/data/import-readiness";

export const dynamic = "force-dynamic";

const statusMeta: Record<ImportReadinessCheck["status"], { label: string; badge: "success" | "warning" | "danger"; icon: typeof CheckCircle2 }> = {
  ready: { label: "已就绪", badge: "success", icon: CheckCircle2 },
  warning: { label: "建议补齐", badge: "warning", icon: AlertTriangle },
  blocked: { label: "需处理", badge: "danger", icon: CircleDotDashed },
};

const importTypeLabels = {
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

export default async function ImportReadinessPage() {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");
  const readiness = await getImportReadiness();
  const blockedCount = readiness.checks.filter((check) => check.status === "blocked").length;
  const warningCount = readiness.checks.filter((check) => check.status === "warning").length;

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="真实数据试运行看板"
        description="导入真实订单前，先确认原料、商品、配方、采购和别名是否齐全；失败批次和预警会集中显示在这里。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/imports/history">导入历史</Link>
            </Button>
            <Button asChild>
              <Link href="/imports/orders">
                <UploadCloud className="h-4 w-4" />
                导入订单
              </Link>
            </Button>
          </div>
        }
      />

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>阻塞项</CardTitle>
            <CardDescription>未处理前不建议导入真实订单。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums text-red-700">{blockedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>建议补齐</CardTitle>
            <CardDescription>不阻塞导入，但会影响成本和匹配质量。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums text-amber-700">{warningCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>已导入销售单</CardTitle>
            <CardDescription>用于验收销售、库存扣减和现金收入。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums text-emerald-800">{readiness.counts.salesOrders}</div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-5 grid gap-4 lg:grid-cols-2">
        {readiness.checks.map((check) => {
          const meta = statusMeta[check.status];
          const Icon = meta.icon;
          return (
            <Card key={check.key}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{check.title}</CardTitle>
                    <CardDescription>{check.description}</CardDescription>
                  </div>
                  <Badge variant={meta.badge}>
                    <Icon className="mr-1 h-3.5 w-3.5" />
                    {meta.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3 border-t border-[var(--line)]">
                <div>
                  <div className="text-xs text-stone-500">当前数量</div>
                  <div className="mt-1 text-2xl font-semibold tabular-nums text-stone-950">{check.count}</div>
                </div>
                <Button asChild variant={check.status === "ready" ? "secondary" : "default"} size="sm">
                  <Link href={check.actionHref}>{check.actionLabel}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {readiness.missingRecipeProducts.length > 0 ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>缺少配方的商品</CardTitle>
            <CardDescription>这些商品在订单导入时会被拦截，先补配方才能自动扣减库存。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {readiness.missingRecipeProducts.map((product) => (
              <Badge key={product.id} variant="danger">
                {product.category} · {product.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        <BatchTable title="最近失败批次" empty="暂无失败批次" batches={readiness.recentFailedBatches} />
        <BatchTable title="最近预警批次" empty="暂无预警批次" batches={readiness.recentWarningBatches} />
      </section>
    </AppShell>
  );
}

function BatchTable({
  title,
  empty,
  batches,
}: {
  title: string;
  empty: string;
  batches: Awaited<ReturnType<typeof getImportReadiness>>["recentFailedBatches"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>点击导入历史可查看完整批次。</CardDescription>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <EmptyState title={empty} description="真实导入后，异常和跳过信息会沉淀到这里。" />
        ) : (
          <TableContainer>
            <Table className="min-w-[620px]">
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>来源</TableHead>
                  <TableHead className="text-right">预警</TableHead>
                  <TableHead>错误</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="whitespace-nowrap text-stone-600">{formatTime(batch.created_at)}</TableCell>
                    <TableCell>
                      <Badge>{importTypeLabels[batch.import_type]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium">
                      <Link href={`/imports/history/${batch.id}`} className="text-emerald-700 hover:underline">
                        {batch.source_file}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{batch.warning_count}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-stone-600">
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
      </CardContent>
    </Card>
  );
}
