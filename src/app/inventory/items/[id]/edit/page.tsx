import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { updateInventoryItemAction } from "@/lib/actions/inventory";
import { requirePermission, requireProfile } from "@/lib/auth";
import { INVENTORY_CATEGORIES } from "@/lib/constants";
import { getInventoryItem } from "@/lib/data/inventory";

export const dynamic = "force-dynamic";

const postgresUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export default async function EditInventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!postgresUuid.test(id)) redirect("/inventory/items");

  const profile = await requireProfile();
  requirePermission(profile, "inventory.manage");
  const item = await getInventoryItem(id);
  if (!item) redirect("/inventory/items");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title={`编辑原料 · ${item.name}`}
        description="修改原料基础资料。库存数量仍只能通过采购、销售、损耗、盘点流水变化。"
        action={<Button asChild variant="secondary"><Link href="/inventory/items">返回库存中心</Link></Button>}
      />
      <form action={updateInventoryItemAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <input type="hidden" name="item_id" value={item.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">原料名称</Label>
            <Input id="name" name="name" defaultValue={item.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Select id="category" name="category" required defaultValue={item.category}>
              {INVENTORY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">单位</Label>
            <Select id="unit" name="unit" required defaultValue={item.unit}>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="pcs">pcs</option>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="specification">规格</Label>
            <Input id="specification" name="specification" defaultValue={item.specification ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="safe_stock">安全库存</Label>
            <Input id="safe_stock" name="safe_stock" type="number" step="0.001" min="0" defaultValue={item.safe_stock} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost_price">参考成本</Label>
            <Input id="cost_price" name="cost_price" type="number" step="0.0001" min="0" defaultValue={item.cost_price} required />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button>保存修改</Button>
        </div>
      </form>
    </AppShell>
  );
}
