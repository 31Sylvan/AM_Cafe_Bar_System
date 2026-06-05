import Link from "next/link";
import { Search } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getTrialRunValidation } from "@/lib/data/import-readiness";
import type { ImportBatch } from "@/lib/types";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

const checkVariant = {
  ok: "success",
  warning: "warning",
  blocked: "danger",
} as const;

const checkLabel = {
  ok: "通过",
  warning: "需复核",
  blocked: "阻塞",
} as const;

const importTypeLabels: Record<ImportBatch["import_type"], string> = {
  products: "商品",
  inventory: "库存",
  purchases: "采购",
  recipes: "配方",
  orders: "订单",
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function ImportValidationPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth();
  const validation = await getTrialRunValidation(month);
  const blockedCount = validation.checks.filter((check) => check.status === "blocked").length;
  const warningCount = validation.checks.filter((check) => check.status === "warning").length;
  const passedCount = validation.checks.filter((check) => check.status === "ok").length;

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="真实数据验收"
        description="按月份核对订单导入后是否已经同步销售、库存扣减、现金流和利润表。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/imports/readiness">试运行看板</Link>
            </Button>
            <Button asChild>
              <Link href={`/finance/analysis?month=${validation.month}`}>经营分析</Link>
            </Button>
          </div>
        }
      />

      <form action="/imports/validation" className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-[var(--line)] bg-[var(--card)] p-4">
        <div>
          <label htmlFor="month" className="text-xs font-medium text-stone-500">验收月份</label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={validation.month}
            className="mt-1 h-10 rounded-md border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" />
          查看月份
        </Button>
      </form>

      <section className="mb-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="通过项" value={`${passedCount}`} tone="success" />
        <Metric label="阻塞项" value={`${blockedCount}`} tone={blockedCount > 0 ? "danger" : "success"} />
        <Metric label="需复核" value={`${warningCount}`} tone={warningCount > 0 ? "warning" : "success"} />
        <Metric label="销售订单" value={`${validation.summary.salesOrderCount}`} />
        <Metric label="销售收入" value={formatMoney(validation.summary.salesRevenue)} />
        <Metric label="库存扣减" value={`${validation.summary.saleMovementCount}`} />
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{validation.monthLabel} 验收清单</CardTitle>
            <CardDescription>阻塞项需要先处理；需复核项不一定错误，但会影响经营分析可信度。</CardDescription>
          </CardHeader>
          <CardContent>
            <TableContainer>
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>检查项</TableHead>
                    <TableHead className="text-right">预期</TableHead>
                    <TableHead className="text-right">实际</TableHead>
                    <TableHead className="text-right">差异</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validation.checks.map((check) => (
                    <TableRow key={check.key}>
                      <TableCell>
                        <div className="font-medium text-stone-950">{check.title}</div>
                        <div className="mt-1 text-xs leading-5 text-stone-500">{check.message}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCheckNumber(check.expected)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCheckNumber(check.actual)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCheckNumber(check.difference)}</TableCell>
                      <TableCell>
                        <Badge variant={checkVariant[check.status]}>{checkLabel[check.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant={check.status === "ok" ? "secondary" : "default"}>
                          <Link href={check.actionHref}>{check.actionLabel}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>链路摘要</CardTitle>
            <CardDescription>用于快速判断本月真实导入是否完成闭环。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Summary label="订单收入" value={formatMoney(validation.summary.salesRevenue)} />
            <Summary label="销售现金收入" value={formatMoney(validation.summary.cashSalesIncome)} />
            <Summary label="现金差异" value={formatMoney(validation.summary.cashDifference)} />
            <Summary label="销售明细行" value={`${validation.summary.salesLineCount}`} />
            <Summary label="理论成本" value={formatMoney(validation.summary.theoreticalCost)} />
            <Summary label="利润表原料成本" value={formatMoney(validation.summary.profitLossMaterialCost)} />
            <Summary label="销售扣减数量" value={formatQty(validation.summary.saleMovementQty)} />
            <Summary label="本月导入订单" value={`${validation.summary.importedOrderCount}`} />
            <Summary label="跳过/重复" value={`${validation.summary.duplicateSkippedCount}`} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近导入批次</CardTitle>
            <CardDescription>仅显示当前验收月份创建的最近批次。</CardDescription>
          </CardHeader>
          <CardContent>
            {validation.recentBatches.length === 0 ? (
              <EmptyState title="本月暂无导入批次" description="导入商品、库存、采购、配方或订单后，这里会出现批次记录。" />
            ) : (
              <div className="space-y-2">
                {validation.recentBatches.map((batch) => (
                  <Link key={batch.id} href={`/imports/history/${batch.id}`} className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] p-3 text-sm hover:bg-stone-50">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{batch.source_file}</div>
                      <div className="mt-1 text-xs text-stone-500">{importTypeLabels[batch.import_type]} · 入库 {batch.imported_rows} · 跳过 {batch.skipped_rows}</div>
                    </div>
                    <Badge variant={batch.status === "completed" ? "success" : "danger"}>
                      {batch.status === "completed" ? "完成" : "失败"}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>缺配方商品</CardTitle>
            <CardDescription>这些商品会让订单导入或成本核算无法完整闭环。</CardDescription>
          </CardHeader>
          <CardContent>
            {validation.missingRecipeProducts.length === 0 ? (
              <EmptyState title="配方完整" description="当前没有发现启用商品缺少配方。" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {validation.missingRecipeProducts.map((product) => (
                  <Button key={product.id} asChild size="sm" variant="secondary">
                    <Link href={`/products/${product.id}`}>{product.category} · {product.name}</Link>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const color = {
    default: "border-[var(--line)] bg-[var(--card)] text-stone-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-700",
  }[tone];

  return (
    <div className={`rounded-md border p-4 ${color}`}>
      <div className="text-sm opacity-80">{label}</div>
      <div className="mt-2 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-[var(--line)] bg-stone-50 px-3 py-2">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium tabular-nums text-stone-950">{value}</span>
    </div>
  );
}

function formatCheckNumber(value: number) {
  if (Math.abs(value) >= 1000 || !Number.isInteger(value)) {
    return formatMoney(value);
  }
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }).format(value);
}
