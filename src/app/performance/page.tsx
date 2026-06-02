import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { requireOwner, requireProfile } from "@/lib/auth";
import { listEmployeePerformance } from "@/lib/data/staff";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const rows = await listEmployeePerformance();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="员工绩效"
        description="统计总工时、班次数、班次营业额、营业额/小时、迟到和请假次数。"
        action={<ExportButton report="employees" />}
      />
      {rows.length === 0 ? (
        <EmptyState title="暂无绩效数据" description="录入员工、排班和销售后会自动形成绩效排行。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr><th className="px-4 py-3">员工</th><th className="px-4 py-3">总工时</th><th className="px-4 py-3">班次数</th><th className="px-4 py-3">班次营业额</th><th className="px-4 py-3">营业额/小时</th><th className="px-4 py-3">迟到</th><th className="px-4 py-3">请假</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((row) => (
                <tr key={row.employee_id}>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.total_hours}</td>
                  <td className="px-4 py-3">{row.shift_count}</td>
                  <td className="px-4 py-3">{formatMoney(row.shift_revenue)}</td>
                  <td className="px-4 py-3">{formatMoney(row.revenue_per_hour)}</td>
                  <td className="px-4 py-3">{row.late_count}</td>
                  <td className="px-4 py-3">{row.leave_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
