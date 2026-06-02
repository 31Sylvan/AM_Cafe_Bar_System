import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createWasteRecordAction } from "@/lib/actions/operations";
import { requireProfile } from "@/lib/auth";
import { WASTE_REASONS } from "@/lib/constants";
import { listInventoryItems } from "@/lib/data/inventory";

export const dynamic = "force-dynamic";

export default async function NewWastePage() {
  const profile = await requireProfile();
  const items = await listInventoryItems();

  return (
    <AppShell profile={profile}>
      <PageHeader title="录入损耗" description="提交后自动扣减库存，并在库存流水中生成 WASTE 记录。" />
      <form action={createWasteRecordAction} className="max-w-2xl rounded-md border border-stone-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="item_id">原料</Label>
            <Select id="item_id" name="item_id" required disabled={items.length === 0}>
              <option value="">选择原料</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} / {item.unit}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">数量</Label>
            <Input id="qty" name="qty" type="number" min="0.001" step="0.001" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">原因</Label>
            <Select id="reason" name="reason" defaultValue="制作失败" required>
              {WASTE_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="photo">损耗照片</Label>
            <Input id="photo" name="photo" type="file" accept="image/png,image/jpeg,image/webp" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button disabled={items.length === 0}>提交损耗</Button>
        </div>
      </form>
    </AppShell>
  );
}
