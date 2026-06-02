import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { listShifts } from "@/lib/data/staff";

export const dynamic = "force-dynamic";

export default async function ShiftsPage() {
  const profile = await requireProfile();
  const shifts = await listShifts();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="排班管理"
        description={profile.role === "owner" ? "老板可管理全部排班，店员仅查看本人排班。" : "仅显示与你账号绑定的员工排班。"}
        action={profile.role === "owner" ? <Button asChild><Link href="/shifts/new"><Plus className="h-4 w-4" />新建排班</Link></Button> : null}
      />
      {shifts.length === 0 ? (
        <EmptyState title="暂无排班" description="创建排班后可用于工时、绩效和提成统计。" />
      ) : (
        <div className="grid gap-3">
          {shifts.map((shift) => (
            <div key={shift.id} className="flex flex-col justify-between gap-3 rounded-md border border-stone-200 bg-white p-4 sm:flex-row sm:items-center">
              <div>
                <div className="font-medium">{shift.employees?.name ?? shift.employee_id} · {shift.role}</div>
                <div className="mt-1 text-sm text-stone-500">{new Date(shift.start_time).toLocaleString("zh-CN")} - {new Date(shift.end_time).toLocaleString("zh-CN")}</div>
              </div>
              <Badge>{shift.status === "scheduled" ? "已排班" : shift.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
