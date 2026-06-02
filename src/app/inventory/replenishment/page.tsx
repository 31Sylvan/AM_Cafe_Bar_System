import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { listReplenishmentSuggestions } from "@/lib/data/inventory";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

const priorityLabels = {
  urgent: "立即补货",
  soon: "近期关注",
  normal: "建议补货",
};

const priorityClasses = {
  urgent: "border-red-200 bg-red-50 text-red-700",
  soon: "border-amber-200 bg-amber-50 text-amber-800",
  normal: "border-stone-200 bg-stone-50 text-stone-700",
};

export default async function ReplenishmentPage() {
  const profile = await requireProfile();
  const suggestions = await listReplenishmentSuggestions();
  const totalBudget = suggestions.reduce((sum, item) => sum + item.suggested_budget, 0);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="补货建议"
        description="根据安全库存、当前库存和最近 30 天消耗估算建议采购量。"
        action={<ExportButton report="replenishment" />}
      />
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Metric label="建议项数" value={`${suggestions.length}`} />
        <Metric label="建议预算" value={formatMoney(totalBudget)} />
        <Metric label="立即补货" value={`${suggestions.filter((item) => item.priority === "urgent").length}`} />
      </div>
      {suggestions.length === 0 ? (
        <EmptyState title="暂无补货建议" description="所有原料库存都高于建议目标。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">原料</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">当前库存</th>
                <th className="px-4 py-3">安全库存</th>
                <th className="px-4 py-3">日均消耗</th>
                <th className="px-4 py-3">预计可用天数</th>
                <th className="px-4 py-3">建议采购</th>
                <th className="px-4 py-3">预算</th>
                <th className="px-4 py-3">优先级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {suggestions.map((item) => (
                <tr key={item.item_id}>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{formatQty(item.current_qty, item.unit)}</td>
                  <td className="px-4 py-3">{formatQty(item.safe_stock, item.unit)}</td>
                  <td className="px-4 py-3">{formatQty(item.avg_daily_usage, item.unit)}</td>
                  <td className="px-4 py-3">{item.days_until_stockout === null ? "暂无消耗" : `${item.days_until_stockout} 天`}</td>
                  <td className="px-4 py-3 font-medium">{formatQty(item.suggested_order_qty, item.unit)}</td>
                  <td className="px-4 py-3">{formatMoney(item.suggested_budget)}</td>
                  <td className="px-4 py-3">
                    <Badge className={priorityClasses[item.priority]}>{priorityLabels[item.priority]}</Badge>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
