import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { requireOwner, requireProfile } from "@/lib/auth";
import { listCostSummary } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const rows = await listCostSummary();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="成本管理"
        description="理论成本来自销售和配方，实际成本来自库存流水消耗。"
        action={<ExportButton report="costs" />}
      />
      {rows.length === 0 ? (
        <EmptyState title="暂无成本数据" description="录入销售和库存流水后，系统会自动生成成本分析。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">月份</th>
                <th className="px-4 py-3">理论成本</th>
                <th className="px-4 py-3">实际成本</th>
                <th className="px-4 py-3">成本差异</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr key={row.month}>
                  <td className="px-4 py-3">{row.month}</td>
                  <td className="px-4 py-3">{formatMoney(row.theoretical_cost)}</td>
                  <td className="px-4 py-3">{formatMoney(row.actual_cost)}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(row.cost_variance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
