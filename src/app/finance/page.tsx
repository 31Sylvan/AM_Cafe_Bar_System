import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { requireOwner, requireProfile } from "@/lib/auth";
import { getCashflowSummary, listCostSummary, listProfitLoss } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const [cashflow, costs, profitLoss] = await Promise.all([getCashflowSummary(), listCostSummary(), listProfitLoss()]);
  const latestCost = costs[0];
  const latestProfit = profitLoss[0];

  return (
    <AppShell profile={profile}>
      <PageHeader title="财务中心" description="成本、利润表和现金流仅老板可见。" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FinanceCard title="现金余额" value={formatMoney(cashflow?.cash_balance ?? 0)} href="/finance/cashflow" />
        <FinanceCard title="本月理论成本" value={formatMoney(latestCost?.theoretical_cost ?? 0)} href="/finance/costs" />
        <FinanceCard title="本月实际成本" value={formatMoney(latestCost?.actual_cost ?? 0)} href="/finance/costs" />
        <FinanceCard title="本月净利润" value={formatMoney(latestProfit?.net_profit ?? 0)} href="/finance/profit-loss" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link className="rounded-md border border-stone-200 bg-white p-5 hover:border-emerald-300" href="/finance/expenses">
          <h2 className="font-semibold">支出记录</h2>
          <p className="mt-2 text-sm text-stone-500">录入工资、房租、水电、营销等支出，并自动进入现金流。</p>
        </Link>
        <Link className="rounded-md border border-stone-200 bg-white p-5 hover:border-emerald-300" href="/finance/cashflow">
          <h2 className="font-semibold">未来现金预测</h2>
          <p className="mt-2 text-sm text-stone-500">基于最近 30 天现金流水推演未来现金余额，用于短期预警。</p>
        </Link>
        <Link className="rounded-md border border-stone-200 bg-white p-5 hover:border-emerald-300" href="/finance/month-close">
          <h2 className="font-semibold">月结快照</h2>
          <p className="mt-2 text-sm text-stone-500">锁定指定月份的利润、成本和现金余额，形成复盘版本。</p>
        </Link>
      </div>
    </AppShell>
  );
}

function FinanceCard({ title, value, href }: { title: string; value: string; href: string }) {
  return (
    <Link className="rounded-md border border-stone-200 bg-white p-4 hover:border-emerald-300" href={href}>
      <div className="text-sm text-stone-500">{title}</div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
    </Link>
  );
}
