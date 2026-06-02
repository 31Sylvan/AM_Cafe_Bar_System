import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createShiftAction } from "@/lib/actions/staff";
import { requireOwner, requireProfile } from "@/lib/auth";
import { listEmployees } from "@/lib/data/staff";

export const dynamic = "force-dynamic";

export default async function NewShiftPage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const employees = await listEmployees();

  return (
    <AppShell profile={profile}>
      <PageHeader title="新建排班" description="班次会进入员工工时、绩效和提成计算。" />
      <form action={createShiftAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="employee_id">员工</Label>
            <Select id="employee_id" name="employee_id" required disabled={employees.length === 0}>
              <option value="">选择员工</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} / {employee.position}</option>)}
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="start_time">开始时间</Label><Input id="start_time" name="start_time" type="datetime-local" required /></div>
          <div className="space-y-2"><Label htmlFor="end_time">结束时间</Label><Input id="end_time" name="end_time" type="datetime-local" required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="role">岗位</Label><Input id="role" name="role" placeholder="吧台/外场/收银" required /></div>
        </div>
        <div className="mt-6 flex justify-end"><Button disabled={employees.length === 0}>保存排班</Button></div>
      </form>
    </AppShell>
  );
}
