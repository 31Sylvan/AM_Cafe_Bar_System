import { Search } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getBusinessAnalysis } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default async function BusinessAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await requireProfile();
  requirePermission(profile, "finance.view");
  const params = await searchParams;
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth();
  const analysis = await getBusinessAnalysis(month);
  const p = analysis.profitLoss;
  const revenueRows = Object.entries(analysis.revenueByChannel).sort((a, b) => b[1] - a[1]);
  const expenseRows = Object.entries(analysis.expensesByCategory).sort((a, b) => b[1] - a[1]);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="经营分析"
        description="按月份预览利润表和现金流量表关键数据，并导出与线下模板一致的经营分析 Excel。"
        action={<ExportButton report="business-analysis" label="导出经营分析 XLSX" query={{ month }} />}
      />

      <form action="/finance/analysis" className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-[var(--line)] bg-[var(--card)] p-4">
        <div>
          <label htmlFor="month" className="text-xs font-medium text-stone-500">分析月份</label>
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

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="营业收入" value={formatMoney(p.revenue)} description={analysis.monthLabel} />
        <Metric title="毛利" value={formatMoney(p.gross_profit)} description={`毛利率 ${p.gross_margin}%`} />
        <Metric title="净利润" value={formatMoney(p.net_profit)} description={Number(p.net_profit) >= 0 ? "盈利" : "亏损"} tone={Number(p.net_profit) >= 0 ? "success" : "danger"} />
        <Metric title="净现金流" value={formatMoney(analysis.cashflow.net_cashflow)} description={`收入 ${formatMoney(analysis.cashflow.total_income)} / 支出 ${formatMoney(analysis.cashflow.total_expense)}`} />
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>收入结构</CardTitle>
            <CardDescription>按产品经营类型汇总，用于填充利润表收入拆分。</CardDescription>
          </CardHeader>
          <CardContent>
            <BreakdownRow label="咖啡饮品收入" value={analysis.revenueByProductGroup.coffee} total={Number(p.revenue)} />
            <BreakdownRow label="非咖啡饮品收入" value={analysis.revenueByProductGroup.nonCoffee} total={Number(p.revenue)} />
            <BreakdownRow label="食品销售" value={analysis.revenueByProductGroup.food} total={Number(p.revenue)} />
            <BreakdownRow label="其他收入" value={analysis.revenueByProductGroup.other} total={Number(p.revenue)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>费用结构</CardTitle>
            <CardDescription>按支出分类汇总，用于填充利润表营业费用。</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseRows.length === 0 ? (
              <EmptyState title="暂无费用数据" description="录入房租、水电、工资、营销等支出后，这里会显示费用结构。" />
            ) : (
              expenseRows.map(([category, amount]) => (
                <BreakdownRow key={category} label={category} value={amount} total={expenseRows.reduce((sum, [, value]) => sum + value, 0)} />
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>渠道收入</CardTitle>
            <CardDescription>从销售订单渠道汇总，辅助核对小程序、外卖和堂食收入。</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueRows.length === 0 ? (
              <EmptyState title="暂无渠道收入" description="导入或录入销售订单后，这里会显示各渠道收入。" />
            ) : (
              revenueRows.map(([channel, amount]) => (
                <div key={channel} className="flex items-center justify-between border-b border-[var(--line)] py-3 last:border-0">
                  <div className="font-medium text-stone-900">{channel}</div>
                  <Badge>{formatMoney(amount)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>导出说明</CardTitle>
            <CardDescription>导出的 Excel 会生成“利润表”和“现金流量表”两个 sheet。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-stone-600">
            <p>利润表会自动填入营业收入、收入结构、原材料成本、毛利、毛利率、各项费用、营业利润和净利润。</p>
            <p>现金流量表会自动填入经营现金流入、现金流出、净现金流，并附带该月每一笔现金流水明细。</p>
            <ExportButton report="business-analysis" label={`导出 ${analysis.monthLabel} 经营分析`} query={{ month }} />
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function Metric({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string;
  value: string;
  description: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass = {
    default: "text-stone-950",
    success: "text-emerald-800",
    danger: "text-red-700",
  }[tone];

  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
        <div className="mt-2 text-xs text-stone-500">{description}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="border-b border-[var(--line)] py-3 last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-stone-900">{label}</div>
        <div className="text-sm font-semibold tabular-nums">{formatMoney(value)}</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <div className="mt-1 text-xs text-stone-500">{percent}%</div>
    </div>
  );
}
