import Link from "next/link";
import { RotateCcw, Plus } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { reverseWasteRecordAction } from "@/lib/actions/operations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { listWasteRecords } from "@/lib/data/operations";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WastePage() {
  const profile = await requireProfile();
  const records = await listWasteRecords();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="损耗管理"
        description="损耗录入会自动生成 WASTE 库存流水。损耗金额只作为老板分析指标使用。"
        action={
          <Button asChild>
            <Link href="/waste/new">
              <Plus className="h-4 w-4" />
              录入损耗
            </Link>
          </Button>
        }
      />
      {records.length === 0 ? (
        <EmptyState title="暂无损耗记录" description="过期、打翻、制作失败、赠饮等都应录入损耗。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">原料</th>
                <th className="px-4 py-3">原因</th>
                <th className="px-4 py-3">数量</th>
                <th className="px-4 py-3">金额</th>
                <th className="px-4 py-3">照片</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3 text-stone-500">{new Date(record.created_at).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3 font-medium">{record.inventory_items?.name ?? record.item_id}</td>
                  <td className="px-4 py-3">
                    <Badge>{record.reason}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatQty(record.qty, record.inventory_items?.unit)}</td>
                  <td className="px-4 py-3">
                    {profile.role === "owner" ? formatMoney(Number(record.qty) * Number(record.inventory_items?.cost_price ?? 0)) : "无权限"}
                  </td>
                  <td className="px-4 py-3">
                    {record.photo_url ? (
                      <a className="text-emerald-700 hover:text-emerald-900" href={record.photo_url} target="_blank" rel="noreferrer">
                        查看
                      </a>
                    ) : (
                      <span className="text-stone-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {record.voided ? <Badge variant="muted">已冲正</Badge> : <Badge variant="warning">有效</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {profile.role === "owner" && !record.voided ? (
                      <form action={reverseWasteRecordAction}>
                        <input type="hidden" name="waste_record_id" value={record.id} />
                        <Button size="sm" variant="secondary">
                          <RotateCcw className="h-3.5 w-3.5" />
                          冲正
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-stone-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
