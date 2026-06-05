import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createCommissionRuleAction, deleteCommissionRuleAction, updateCommissionRuleAction } from "@/lib/actions/staff";
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
                <div key={rule.id} className="p-4 text-sm">
                  <ReactiveForm action={updateCommissionRuleAction} successText="规则已更新">
                    <input type="hidden" name="rule_id" value={rule.id} />
                    <div className="grid gap-3 lg:grid-cols-[150px_1fr_130px_130px_auto] lg:items-end">
                      <div className="space-y-1">
                        <Label htmlFor={`month-${rule.id}`}>月份</Label>
                        <Input id={`month-${rule.id}`} name="month" type="month" defaultValue={String(rule.month).slice(0, 7)} required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`target-${rule.id}`}>营业额目标</Label>
                        <Input id={`target-${rule.id}`} name="revenue_target" type="number" min="0" step="0.01" defaultValue={Number(rule.revenue_target)} required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`rate-${rule.id}`}>奖金池比例</Label>
                        <Input id={`rate-${rule.id}`} name="bonus_pool_rate" type="number" min="0" max="1" step="0.0001" defaultValue={Number(rule.bonus_pool_rate)} required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`status-${rule.id}`}>状态</Label>
                        <Select id={`status-${rule.id}`} name="status" defaultValue={rule.status}>
                          <option value="active">启用</option>
                          <option value="inactive">停用</option>
                        </Select>
                      </div>
                      <Button size="sm">保存</Button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-stone-500">
                      <span>当前目标 {formatMoney(rule.revenue_target)}，奖金池比例 {(Number(rule.bonus_pool_rate) * 100).toFixed(2)}%</span>
                      <span>{rule.status === "active" ? "启用中" : "已停用"}</span>
                    </div>
                  </ReactiveForm>
                  <ReactiveForm action={deleteCommissionRuleAction} successText="规则已删除">
                    <input type="hidden" name="rule_id" value={rule.id} />
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="danger">删除规则</Button>
                    </div>
                  </ReactiveForm>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
