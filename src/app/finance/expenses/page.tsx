import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requirePermission, requireProfile } from "@/lib/auth";
import { listExpenseRecords } from "@/lib/data/finance";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const profile = await requireProfile();
  requirePermission(profile, "finance.manage");
  const expenses = await listExpenseRecords();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="支出记录"
        description="支出会自动写入现金流，用于利润表和现金余额。"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton report="expenses" />
            <Button asChild>
              <Link href="/finance/expenses/new">
                <Plus className="h-4 w-4" />
                新建支出
              </Link>
            </Button>
          </div>
        }
      />
      {expenses.length === 0 ? (
        <EmptyState title="暂无支出记录" description="录入房租、水电、工资、营销等支出后，利润表会自动更新。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">分类</th>
                <th className="px-4 py-3">金额</th>
                <th className="px-4 py-3">支付方式</th>
                <th className="px-4 py-3">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3">{expense.expense_date}</td>
                  <td className="px-4 py-3">
                    <Badge>{expense.category}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatMoney(expense.amount)}</td>
                  <td className="px-4 py-3">{expense.payment_method}</td>
                  <td className="px-4 py-3 text-stone-500">{expense.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
