import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireOwner, requireProfile } from "@/lib/auth";
import { listEmployees } from "@/lib/data/staff";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const employees = await listEmployees();

  return (
    <AppShell profile={profile}>
      <PageHeader title="员工管理" description="员工薪资字段仅老板可见。" action={<Button asChild><Link href="/employees/new"><Plus className="h-4 w-4" />新建员工</Link></Button>} />
      {employees.length === 0 ? (
        <EmptyState title="暂无员工" description="添加员工后即可创建排班、统计绩效和计算提成。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr><th className="px-4 py-3">姓名</th><th className="px-4 py-3">电话</th><th className="px-4 py-3">职位</th><th className="px-4 py-3">时薪</th><th className="px-4 py-3">入职日期</th><th className="px-4 py-3">状态</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-4 py-3 font-medium">{employee.name}</td>
                  <td className="px-4 py-3">{employee.phone ?? "-"}</td>
                  <td className="px-4 py-3">{employee.position}</td>
                  <td className="px-4 py-3">{formatMoney(employee.hourly_rate)}</td>
                  <td className="px-4 py-3">{employee.hire_date}</td>
                  <td className="px-4 py-3"><Badge>{employee.status === "active" ? "在职" : "离职"}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
