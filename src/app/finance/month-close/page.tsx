import { Lock } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMonthCloseSnapshotAction, deleteMonthCloseSnapshotAction } from "@/lib/actions/finance";
import { requirePermission, requireProfile } from "@/lib/auth";
import { listMonthCloseSnapshots } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MonthClosePage() {
  const profile = await requireProfile();
  requirePermission(profile, "finance.manage");
  const rows = await listMonthCloseSnapshots();
  const defaultMonth = new Date().toISOString().slice(0, 7);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="月结快照"
        description="将指定月份的利润、成本和现金余额固化成快照，便于复盘和对账。"
        action={<ExportButton report="month-close" />}
      />
      <ReactiveForm action={createMonthCloseSnapshotAction} className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-stone-200 bg-white p-4" successText="月结快照已生成">
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-500" htmlFor="month">月结月份</label>
          <Input id="month" name="month" type="month" defaultValue={defaultMonth} className="h-9 w-44" required />
        </div>
        <Button>
          <Lock className="h-4 w-4" />
          生成月结快照
        </Button>
      </ReactiveForm>

      {rows.length === 0 ? (
        <EmptyState title="暂无月结快照" description="选择月份生成快照后，会在这里保留固定版本的经营结果。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">月份</th>
                <th className="px-4 py-3">收入</th>
                <th className="px-4 py-3">毛利</th>
                <th className="px-4 py-3">毛利率</th>
                <th className="px-4 py-3">净利润</th>
                <th className="px-4 py-3">理论成本</th>
                <th className="px-4 py-3">实际成本</th>
                <th className="px-4 py-3">成本差异</th>
                <th className="px-4 py-3">现金余额</th>
                <th className="px-4 py-3">月结时间</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium">{row.month}</td>
                  <td className="px-4 py-3">{formatMoney(row.revenue)}</td>
                  <td className="px-4 py-3">{formatMoney(row.gross_profit)}</td>
                  <td className="px-4 py-3"><Badge>{row.gross_margin}%</Badge></td>
                  <td className="px-4 py-3 font-medium">{formatMoney(row.net_profit)}</td>
                  <td className="px-4 py-3">{formatMoney(row.theoretical_cost)}</td>
                  <td className="px-4 py-3">{formatMoney(row.actual_cost)}</td>
                  <td className="px-4 py-3">{formatMoney(row.cost_variance)}</td>
                  <td className="px-4 py-3">{formatMoney(row.cash_balance)}</td>
                  <td className="px-4 py-3 text-stone-500">{new Date(row.closed_at).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3">
                    <ReactiveForm action={deleteMonthCloseSnapshotAction} successText="已删除">
                      <input type="hidden" name="snapshot_id" value={row.id} />
                      <Button size="sm" variant="danger">删除</Button>
                    </ReactiveForm>
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
