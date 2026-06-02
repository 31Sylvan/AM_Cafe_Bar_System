import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createExpenseRecordAction } from "@/lib/actions/finance";
import { requirePermission, requireProfile } from "@/lib/auth";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NewExpensePage() {
  const profile = await requireProfile();
  requirePermission(profile, "finance.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader title="新建支出" description="财务支出仅老板可录入和查看。" />
      <form action={createExpenseRecordAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expense_date">支出日期</Label>
            <Input id="expense_date" name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Select id="category" name="category" defaultValue="房租" required>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">金额</Label>
            <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_method">支付方式</Label>
            <Select id="payment_method" name="payment_method" defaultValue="微信" required>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="note">备注</Label>
            <Input id="note" name="note" placeholder="例如 6 月房租" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button>保存支出</Button>
        </div>
      </form>
    </AppShell>
  );
}
