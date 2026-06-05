import Link from "next/link";
import { Plus, RotateCcw } from "lucide-react";
import { FilterBar } from "@/components/app/filter-bar";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { reverseStockCountAction } from "@/lib/actions/operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { STOCK_COUNT_TYPES } from "@/lib/constants";
import { listStockCounts } from "@/lib/data/operations";
import { cleanSearchParam } from "@/lib/filters";

export const dynamic = "force-dynamic";

const typeLabels = Object.fromEntries(STOCK_COUNT_TYPES.map((item) => [item.value, item.label]));

export default async function StockCountsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const from = cleanSearchParam(params.from);
  const to = cleanSearchParam(params.to);
  const status = cleanSearchParam(params.status);
  const counts = await listStockCounts({ from, to, status: status === "draft" || status === "completed" ? status : "all" });

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="盘点管理"
        description="盘点完成后，系统按实际库存和理论库存差异生成 COUNT_ADJUST 流水。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/stock-counts/mobile">移动盘点</Link>
            </Button>
            <Button asChild>
              <Link href="/stock-counts/new">
                <Plus className="h-4 w-4" />
                新建盘点
              </Link>
            </Button>
          </div>
        }
      />
      <FilterBar
        action="/stock-counts"
        from={from}
        to={to}
        selectName="status"
        selectLabel="状态"
        selectValue={status}
        selectOptions={[
          { value: "all", label: "全部" },
          { value: "draft", label: "草稿" },
          { value: "completed", label: "已完成" },
        ]}
      />
      {counts.length === 0 ? (
        <EmptyState title="暂无盘点记录" description="每日、每周、每月盘点都可以从这里录入。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">类型</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">创建时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {counts.map((count) => (
                <tr key={count.id}>
                  <td className="px-4 py-3">
                    <Link href={`/stock-counts/${count.id}`} className="text-emerald-700 hover:underline">
                      {count.count_date}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{typeLabels[count.count_type]}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={count.voided ? "muted" : count.status === "completed" ? "success" : "default"}
                    >
                      {count.voided ? "已冲正" : count.status === "completed" ? "已完成" : "草稿"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{new Date(count.created_at).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3 text-right">
                    {profile.role === "owner" && count.status === "completed" && !count.voided ? (
                      <form action={reverseStockCountAction}>
                        <input type="hidden" name="stock_count_id" value={count.id} />
                        <Button size="sm" variant="secondary">
                          <RotateCcw className="h-3.5 w-3.5" />
                          冲正
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-stone-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
