import { Search } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { Button } from "@/components/ui/button";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getCashflowForecast, getCashflowStatement, getCashflowSummary } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireProfile();
  requirePermission(profile, "finance.view");
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth();
  const [cashflow, forecast, statement] = await Promise.all([
    getCashflowSummary(),
    getCashflowForecast(),
    getCashflowStatement({ month }),
  ]);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="现金流"
        description="销售收入和支出记录会自动形成现金流水，可按月份导出明细现金流表。"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton report="business-analysis" label="导出经营分析 XLSX" query={{ month }} />
            <ExportButton report="cashflow" label="导出本月现金流" query={{ month }} />
            <ExportButton report="cashflow" label="导出全部现金流" />
          </div>
        }
      />
      <form action="/finance/cashflow" className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-[var(--line)] bg-[var(--card)] p-4">
        <div>
          <label htmlFor="month" className="text-xs font-medium text-stone-500">导出月份</label>
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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <div className="text-sm text-stone-500">总收入</div>
          <div className="mt-3 text-2xl font-semibold">{formatMoney(cashflow?.total_income ?? 0)}</div>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <div className="text-sm text-stone-500">总支出</div>
          <div className="mt-3 text-2xl font-semibold">{formatMoney(cashflow?.total_expense ?? 0)}</div>
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <div className="text-sm text-stone-500">现金余额</div>
          <div className="mt-3 text-2xl font-semibold">{formatMoney(cashflow?.cash_balance ?? 0)}</div>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-md border border-stone-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">{month} 现金流明细</h2>
            <p className="mt-1 text-sm text-stone-500">
              收入 {formatMoney(statement.total_income)}，支出 {formatMoney(statement.total_expense)}，净现金流 {formatMoney(statement.net_cashflow)}
            </p>
          </div>
          <ExportButton report="cashflow" label="导出此表" query={{ month }} />
        </div>
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-stone-100 text-xs font-medium text-stone-500">
            <tr>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">方向</th>
              <th className="px-4 py-3">分类</th>
              <th className="px-4 py-3">金额</th>
              <th className="px-4 py-3">支付方式</th>
              <th className="px-4 py-3">来源</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {statement.transactions.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-stone-500" colSpan={6}>该月份暂无现金流水。</td>
              </tr>
            ) : (
              statement.transactions.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.transaction_date}</td>
                  <td className="px-4 py-3">{row.direction === "income" ? "收入" : "支出"}</td>
                  <td className="px-4 py-3">{row.category}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(row.amount)}</td>
                  <td className="px-4 py-3">{row.payment_method}</td>
                  <td className="px-4 py-3 text-stone-500">{row.reference_type}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6 rounded-md border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">未来 30 天现金预测</h2>
        <p className="mt-2 text-sm text-stone-500">基于最近 30 天现金流水的日均净现金流推演，适合作为短期预警参考。</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {forecast.filter((_, index) => [0, 6, 13, 20, 29].includes(index)).map((row) => (
            <div key={row.date} className="rounded-md border border-stone-200 p-3">
              <div className="text-xs text-stone-500">{row.date}</div>
              <div className="mt-2 font-semibold">{formatMoney(row.projected_balance)}</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
