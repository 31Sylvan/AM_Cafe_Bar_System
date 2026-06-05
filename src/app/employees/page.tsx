import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createEmployeeAccountAction, resetEmployeePasswordAction } from "@/lib/actions/staff";
import { requirePermission, requireProfile } from "@/lib/auth";
import { listEmployeeAccountInvites, listEmployees } from "@/lib/data/staff";
import { hasPermission } from "@/lib/permissions";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const profile = await requireProfile();
  requirePermission(profile, "employee.view");
  const canManageEmployees = hasPermission(profile, "employee.manage");
  const [employees, accountInvites] = await Promise.all([
    listEmployees(),
    canManageEmployees ? listEmployeeAccountInvites() : Promise.resolve([]),
  ]);
  const inviteByEmployeeId = new Map(accountInvites.map((invite) => [invite.employee_id, invite]));

  return (
    <AppShell profile={profile}>
      <PageHeader title="员工管理" description="员工薪资字段仅老板可见。" action={<Button asChild><Link href="/employees/new"><Plus className="h-4 w-4" />新建员工</Link></Button>} />
      {employees.length === 0 ? (
        <EmptyState title="暂无员工" description="添加员工后即可创建排班、统计绩效和计算提成。" />
      ) : (
        <TableContainer>
          <Table className="min-w-[940px]">
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>电话</TableHead>
                <TableHead>职位</TableHead>
                <TableHead>时薪</TableHead>
                <TableHead>入职日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>登录账号</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.phone ?? "-"}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>{formatMoney(employee.hourly_rate)}</TableCell>
                  <TableCell>{employee.hire_date}</TableCell>
                  <TableCell><Badge>{employee.status === "active" ? "在职" : "离职"}</Badge></TableCell>
                  <TableCell>
                    {employee.profile_id ? (
                      <div className="grid min-w-[280px] gap-2">
                        <Badge variant="success">已绑定</Badge>
                        {canManageEmployees ? (
                          <ReactiveForm action={resetEmployeePasswordAction} className="flex gap-2" successText="密码已重置">
                            <input type="hidden" name="employee_id" value={employee.id} />
                            <Input name="password" type="text" placeholder="新密码，至少 8 位" minLength={8} required />
                            <Button size="sm" variant="secondary">重置</Button>
                          </ReactiveForm>
                        ) : null}
                      </div>
                    ) : inviteByEmployeeId.has(employee.id) ? (
                      <div className="space-y-1">
                        <Badge variant="warning">待开通</Badge>
                        <div className="text-xs text-stone-500">{inviteByEmployeeId.get(employee.id)?.email}</div>
                      </div>
                    ) : canManageEmployees ? (
                      <ReactiveForm action={createEmployeeAccountAction} className="grid min-w-[360px] gap-2" successText="账号已创建">
                        <input type="hidden" name="employee_id" value={employee.id} />
                        <Input name="email" type="email" placeholder="员工登录邮箱" required />
                        <div className="flex gap-2">
                          <Input name="password" type="text" placeholder="临时密码，至少 8 位" minLength={8} required />
                          <Button size="sm">创建账号</Button>
                        </div>
                      </ReactiveForm>
                    ) : (
                      <span className="text-sm text-stone-500">未绑定</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AppShell>
  );
}
