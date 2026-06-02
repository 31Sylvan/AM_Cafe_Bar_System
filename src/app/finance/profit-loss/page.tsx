import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { Badge } from "@/components/ui/badge";
import { requireOwner, requireProfile } from "@/lib/auth";
import { listProfitLoss } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfitLossPage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const rows = await listProfitLoss();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="利润表"
        description="按月汇总营业收入、原料成本、人工、房租、水电、营销和净利润。"
        action={<ExportButton report="profit-loss" />}
      />
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
