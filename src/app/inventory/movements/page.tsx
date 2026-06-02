import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { FilterBar } from "@/components/app/filter-bar";
import { Badge } from "@/components/ui/badge";
import { requireProfile } from "@/lib/auth";
import { MOVEMENT_LABELS } from "@/lib/constants";
import { listInventoryMovements } from "@/lib/data/inventory";
import { cleanSearchParam } from "@/lib/filters";
import type { InventoryMovementType } from "@/lib/types";
import { formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; movement_type?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const from = cleanSearchParam(params.from);
  const to = cleanSearchParam(params.to);
  const movementType = cleanSearchParam(params.movement_type);
  const movementTypes = Object.keys(MOVEMENT_LABELS) as InventoryMovementType[];
  const movements = await listInventoryMovements({
    from,
    to,
    movement_type: movementTypes.includes(movementType as InventoryMovementType) ? (movementType as InventoryMovementType) : "all",
  });

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="库存流水"
        description="所有库存变化必须通过流水记录，采购、销售、损耗和盘点都会在这里留下审计轨迹。"
        action={<ExportButton report="movements" />}
      />
      <FilterBar
        action="/inventory/movements"
        from={from}
        to={to}
        selectName="movement_type"
        selectLabel="流水类型"
        selectValue={movementType}
        selectOptions={[
          { value: "all", label: "全部" },
          ...movementTypes.map((type) => ({ value: type, label: MOVEMENT_LABELS[type] })),
        ]}
      />
      {movements.length === 0 ? (
        <EmptyState title="暂无库存流水" description="完成采购入库后，这里会出现第一批库存流水。" />
      ) : (
        <div className="overflow-hidden rounded-md border border-stone-200 bg-white">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-stone-100 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3">原料</th>
                <th className="px-4 py-3">类型</th>
                <th className="px-4 py-3">变动</th>
                <th className="px-4 py-3">变动前</th>
                <th className="px-4 py-3">变动后</th>
                <th className="px-4 py-3">来源</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3 text-stone-500">{new Date(movement.created_at).toLocaleString("zh-CN")}</td>
                  <td className="px-4 py-3 font-medium">{movement.inventory_items?.name ?? movement.item_id}</td>
                  <td className="px-4 py-3">
                    <Badge>{MOVEMENT_LABELS[movement.movement_type]}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatQty(movement.qty, movement.inventory_items?.unit)}</td>
                  <td className="px-4 py-3">{formatQty(movement.before_qty, movement.inventory_items?.unit)}</td>
                  <td className="px-4 py-3">{formatQty(movement.after_qty, movement.inventory_items?.unit)}</td>
                  <td className="px-4 py-3 text-stone-500">{movement.reference_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
