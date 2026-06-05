import { Search } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission, requireProfile } from "@/lib/auth";
import { listProfitLossByFilter } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireProfile();
  requirePermission(profile, "finance.view");
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : "";
  const rows = await listProfitLossByFilter({ month: month || undefined });
  const selectedMonth = month || currentMonth();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="利润表"
        description="按月汇总营业收入、原料成本、人工、房租、水电、营销和净利润，可导出全部或指定月份。"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton report="business-analysis" label="导出经营分析 XLSX" query={{ month: selectedMonth }} />
            <ExportButton report="profit-loss" label="导出所选月份" query={{ month: selectedMonth }} />
            <ExportButton report="profit-loss" label="导出全部利润表" />
          </div>
        }
      />
      <form action="/finance/profit-loss" className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-[var(--line)] bg-[var(--card)] p-4">
        <div>
          <label htmlFor="month" className="text-xs font-medium text-stone-500">筛选月份</label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={month}
            className="mt-1 h-10 rounded-md border border-[var(--line)] bg-white px-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" />
          查看月份
        </Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="暂无利润表数据" description="录入销售、成本和支出后，利润表会自动生成。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">月份</th>
                <th className="px-4 py-3">收入</th>
                <th className="px-4 py-3">原料成本</th>
                <th className="px-4 py-3">毛利</th>
                <th className="px-4 py-3">毛利率</th>
                <th className="px-4 py-3">人工</th>
                <th className="px-4 py-3">房租</th>
                <th className="px-4 py-3">水电</th>
                <th className="px-4 py-3">营销</th>
                <th className="px-4 py-3">净利润</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr key={row.month}>
                  <td className="px-4 py-3">{row.month}</td>
                  <td className="px-4 py-3">{formatMoney(row.revenue)}</td>
                  <td className="px-4 py-3">{formatMoney(row.material_cost)}</td>
                  <td className="px-4 py-3">{formatMoney(row.gross_profit)}</td>
                  <td className="px-4 py-3">
                    <Badge>{row.gross_margin}%</Badge>
                  </td>
                  <td className="px-4 py-3">{formatMoney(row.labor_cost)}</td>
                  <td className="px-4 py-3">{formatMoney(row.rent_cost)}</td>
                  <td className="px-4 py-3">{formatMoney(row.utility_cost)}</td>
                  <td className="px-4 py-3">{formatMoney(row.marketing_cost)}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(row.net_profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
