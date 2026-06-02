import { AppShell, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { requireOwner, requireProfile } from "@/lib/auth";
import { getCashflowForecast, getCashflowSummary } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CashflowPage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const [cashflow, forecast] = await Promise.all([getCashflowSummary(), getCashflowForecast()]);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="现金流"
        description="销售收入和支出记录会自动形成现金流水。未来 30 天预测已预留模型入口。"
        action={<ExportButton report="cashflow" />}
      />
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
