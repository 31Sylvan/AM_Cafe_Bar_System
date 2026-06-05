import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateEmployeeAction } from "@/lib/actions/staff";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getAvailableStores } from "@/lib/data/settings";
import { getEmployeeForEdit } from "@/lib/data/staff";

export const dynamic = "force-dynamic";

const postgresUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!postgresUuid.test(id)) {
    redirect("/employees");
  }

  const profile = await requireProfile();
  requirePermission(profile, "employee.manage");
  const [employee, stores] = await Promise.all([getEmployeeForEdit(id), getAvailableStores()]);

  if (!employee) {
    redirect("/employees");
  }

  return (
    <AppShell profile={profile}>
      <PageHeader
        title={`编辑员工 · ${employee.name}`}
        description="修改员工基础资料、归属门店、薪资与在职信息。"
        action={
          <Button asChild variant="secondary">
            <Link href="/employees">返回员工管理</Link>
          </Button>
        }
      />
      <form action={updateEmployeeAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <input type="hidden" name="employee_id" value={employee.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="store_id">归属门店</Label>
            <Select id="store_id" name="store_id" defaultValue={employee.store_id} required>
              {stores.map((membership) => (
                <option key={membership.store_id} value={membership.store_id}>
                  {membership.stores?.name ?? membership.store_id}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input id="name" name="name" defaultValue={employee.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">电话</Label>
            <Input id="phone" name="phone" defaultValue={employee.phone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">职位</Label>
            <Input id="position" name="position" defaultValue={employee.position} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hourly_rate">时薪</Label>
            <Input id="hourly_rate" name="hourly_rate" type="number" min="0" step="0.01" defaultValue={employee.hourly_rate} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire_date">入职日期</Label>
            <Input id="hire_date" name="hire_date" type="date" defaultValue={employee.hire_date} required />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button>保存修改</Button>
        </div>
      </form>
    </AppShell>
  );
}
