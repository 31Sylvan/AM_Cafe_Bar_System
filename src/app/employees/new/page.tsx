import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createEmployeeAction } from "@/lib/actions/staff";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getAvailableStores } from "@/lib/data/settings";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const stores = await getAvailableStores();

  return (
    <AppShell profile={profile}>
      <PageHeader title="新建员工" description="员工资料用于排班、绩效和提成计算。" />
      <form action={createEmployeeAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="store_id">归属门店</Label>
            <Select id="store_id" name="store_id" defaultValue={profile.store_id} required>
              {stores.map((membership) => (
                <option key={membership.store_id} value={membership.store_id}>
                  {membership.stores?.name ?? membership.store_id}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="name">姓名</Label><Input id="name" name="name" required /></div>
          <div className="space-y-2"><Label htmlFor="phone">电话</Label><Input id="phone" name="phone" /></div>
          <div className="space-y-2"><Label htmlFor="position">职位</Label><Input id="position" name="position" placeholder="咖啡师/店员" required /></div>
          <div className="space-y-2"><Label htmlFor="hourly_rate">时薪</Label><Input id="hourly_rate" name="hourly_rate" type="number" min="0" step="0.01" required /></div>
          <div className="space-y-2"><Label htmlFor="hire_date">入职日期</Label><Input id="hire_date" name="hire_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
        </div>
        <div className="mt-6 flex justify-end"><Button>保存员工</Button></div>
      </form>
    </AppShell>
  );
}
