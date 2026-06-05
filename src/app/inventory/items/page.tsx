import Link from "next/link";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ExportButton } from "@/components/app/export-button";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateInventoryItemStatusAction } from "@/lib/actions/inventory";
import { requireProfile } from "@/lib/auth";
import { listInventoryBalances } from "@/lib/data/inventory";
import { formatMoney, formatQty } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InventoryItemsPage() {
  const profile = await requireProfile();
  const items = await listInventoryBalances();

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="库存中心"
        description="库存余额由流水聚合计算，不能直接修改数量。"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton report="inventory" />
            {profile.role === "owner" ? (
              <Button asChild>
                <Link href="/inventory/items/new">
                  <Plus className="h-4 w-4" />
                  新建原料
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="还没有库存原料" description="老板账号可先录入咖啡豆、牛奶、酒类、耗材等基础原料。" />
      ) : (
        <TableContainer>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>原料</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>库存</TableHead>
                <TableHead>安全线</TableHead>
                <TableHead>参考成本</TableHead>
                <TableHead>库存价值</TableHead>
                <TableHead>状态</TableHead>
                {profile.role === "owner" ? <TableHead className="text-right">操作</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell className="font-medium text-stone-950">{item.name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{formatQty(item.current_qty, item.unit)}</TableCell>
                  <TableCell>{formatQty(item.safe_stock, item.unit)}</TableCell>
                  <TableCell>{formatMoney(item.cost_price)}</TableCell>
                  <TableCell>{formatMoney(item.inventory_value)}</TableCell>
                  <TableCell>
                    {item.is_low_stock ? <Badge variant="warning">预警</Badge> : <Badge variant="success">正常</Badge>}
                  </TableCell>
                  {profile.role === "owner" ? (
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/inventory/items/${item.item_id}/edit`}>
                            <Edit3 className="h-4 w-4" />
                            编辑
                          </Link>
                        </Button>
                        <ReactiveForm action={updateInventoryItemStatusAction} successText="已停用">
                          <input type="hidden" name="item_id" value={item.item_id} />
                          <input type="hidden" name="status" value="inactive" />
                          <Button size="sm" variant="secondary">
                            <Trash2 className="h-4 w-4" />
                            停用
                          </Button>
                        </ReactiveForm>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AppShell>
  );
}
