import { notFound } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateShiftAction } from "@/lib/actions/staff";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getShiftForEdit, listEmployees } from "@/lib/data/staff";

export const dynamic = "force-dynamic";

export default async function EditShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile();
  requirePermission(profile, "shift.manage");
  const { id } = await params;
  const [shift, employees] = await Promise.all([getShiftForEdit(id), listEmployees()]);

  if (!shift) {
    notFound();
  }

  return (
    <AppShell profile={profile}>
      <PageHeader title="编辑排班" description="调整班次信息后，员工工时、绩效和提成统计会按最新排班重新计算。" />
      <form action={updateShiftAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <input type="hidden" name="shift_id" value={shift.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="employee_id">员工</Label>
            <Select id="employee_id" name="employee_id" defaultValue={shift.employee_id} required disabled={employees.length === 0}>
              <option value="">选择员工</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} / {employee.position}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="start_time">开始时间</Label>
            <Input id="start_time" name="start_time" type="datetime-local" defaultValue={toDatetimeLocal(shift.start_time)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">结束时间</Label>
            <Input id="end_time" name="end_time" type="datetime-local" defaultValue={toDatetimeLocal(shift.end_time)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">岗位</Label>
            <Input id="role" name="role" defaultValue={shift.role} placeholder="吧台/外场/收银" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">状态</Label>
            <Select id="status" name="status" defaultValue={shift.status} required>
              <option value="scheduled">已排班</option>
              <option value="completed">已完成</option>
              <option value="canceled">已取消</option>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button disabled={employees.length === 0}>保存修改</Button>
        </div>
      </form>
    </AppShell>
  );
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
