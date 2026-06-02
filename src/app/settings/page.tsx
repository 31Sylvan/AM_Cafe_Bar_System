import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateStoreSettingsAction } from "@/lib/actions/settings";
import { requireOwner, requireProfile } from "@/lib/auth";
import { getCurrentStore } from "@/lib/data/settings";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireProfile();
  requireOwner(profile);
  const store = await getCurrentStore();

  return (
    <AppShell profile={profile}>
      <PageHeader title="系统设置" description="门店、环境变量、权限、PWA 和数据初始化入口。" />
      <div className="grid gap-5 xl:grid-cols-2">
        <form action={updateStoreSettingsAction} className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <h2 className="font-semibold">门店设置</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">门店名称</Label>
              <Input id="name" name="name" defaultValue={store?.name ?? ""} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_mode">经营模式</Label>
              <Input id="business_mode" name="business_mode" defaultValue={store?.business_mode ?? "早咖夜酒"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">时区</Label>
              <Input id="timezone" name="timezone" defaultValue={store?.timezone ?? "Asia/Shanghai"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">地址</Label>
              <Input id="address" name="address" defaultValue={store?.address ?? ""} />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button>保存门店设置</Button>
          </div>
        </form>
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">当前账号</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="姓名" value={profile.display_name} />
            <Row label="角色" value={profile.role === "owner" ? "老板" : "店员"} />
            <Row label="门店 ID" value={profile.store_id} />
          </div>
        </section>
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">系统状态</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Supabase 环境变量</span>
              {hasSupabaseEnv() ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">已配置</Badge> : <Badge className="border-amber-200 bg-amber-50 text-amber-800">未配置</Badge>}
            </div>
            <Row label="PWA" value="已启用 manifest" />
            <Row label="多门店字段" value="已预留 store_id" />
          </div>
        </section>
        <section className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <h2 className="font-semibold">导入模板</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href="/api/templates/inventory-items" prefetch={false}>原料模板</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/api/templates/products" prefetch={false}>产品模板</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/api/templates/employees" prefetch={false}>员工模板</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/api/templates/purchases" prefetch={false}>采购明细模板</Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href="/api/templates/sales-batch" prefetch={false}>销售批量模板</Link>
            </Button>
          </div>
          <div className="mt-4">
            <Button asChild>
              <Link href="/imports">进入导入预检</Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-stone-500">{label}</span>
      <span className="break-all font-medium text-stone-900">{value}</span>
    </div>
  );
}
