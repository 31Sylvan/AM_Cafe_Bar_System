import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createInventoryItemAction } from "@/lib/actions/inventory";
import { requireOwner, requireProfile } from "@/lib/auth";
import { INVENTORY_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function NewInventoryItemPage() {
  const profile = await requireProfile();
  requireOwner(profile);

  return (
    <AppShell profile={profile}>
      <PageHeader title="新建库存原料" description="单位会按照分类做数据库级约束，避免咖啡豆、奶类、耗材混用单位。" />
      <form action={createInventoryItemAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">原料名称</Label>
            <Input id="name" name="name" placeholder="例如 埃塞俄比亚咖啡豆" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Select id="category" name="category" required defaultValue="咖啡豆">
              {INVENTORY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">单位</Label>
            <Select id="unit" name="unit" required defaultValue="g">
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="pcs">pcs</option>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="specification">规格</Label>
            <Input id="specification" name="specification" placeholder="例如 1kg/袋，24瓶/箱" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="safe_stock">安全库存</Label>
            <Input id="safe_stock" name="safe_stock" type="number" step="0.001" min="0" defaultValue="0" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost_price">参考成本</Label>
            <Input id="cost_price" name="cost_price" type="number" step="0.0001" min="0" defaultValue="0" required />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button>保存原料</Button>
        </div>
      </form>
    </AppShell>
  );
}
