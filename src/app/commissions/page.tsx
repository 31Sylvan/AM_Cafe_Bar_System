import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCommissionRuleAction } from "@/lib/actions/staff";
import { requirePermission, requireProfile } from "@/lib/auth";
import { listCommissionRules } from "@/lib/data/staff";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CommissionsPage() {
  const profile = await requireProfile();
  requirePermission(profile, "commission.manage");
  const rules = await listCommissionRules();

  return (
    <AppShell profile={profile}>
      <PageHeader title="提成系统" description="超额营业额乘以奖金池比例，再按工时占比分配。" />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <ReactiveForm action={createCommissionRuleAction} className="rounded-md border border-stone-200 bg-white p-5" successText="提成规则已创建">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="month">月份</Label>
              <Input id="month" name="month" type="month" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue_target">营业额目标</Label>
              <Input id="revenue_target" name="revenue_target" type="number" min="0" step="0.01" placeholder="30000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bonus_pool_rate">奖金池比例</Label>
              <Input id="bonus_pool_rate" name="bonus_pool_rate" type="number" min="0" max="1" step="0.0001" placeholder="0.03" required />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button>创建并计算</Button>
          </div>
        </ReactiveForm>

        <section className="rounded-md border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-4 font-semibold">提成规则</div>
          {rules.length === 0 ? (
            <div className="p-4"><EmptyState title="暂无提成规则" description="创建规则后系统会按当月工时分配奖金池。" /></div>
          ) : (
            <div className="divide-y divide-stone-100">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <div className="font-medium">{rule.month}</div>
                    <div className="text-stone-500">奖金池比例 {(Number(rule.bonus_pool_rate) * 100).toFixed(2)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatMoney(rule.revenue_target)}</div>
                    <div className="text-stone-500">目标营业额</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
