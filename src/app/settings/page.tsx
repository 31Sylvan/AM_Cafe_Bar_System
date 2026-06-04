import Link from "next/link";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStoreAction, switchCurrentStoreAction, updateStoreSettingsAction } from "@/lib/actions/settings";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getAvailableStores, getCurrentStore } from "@/lib/data/settings";
import { hasSupabaseEnv } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");
  const store = await getCurrentStore();
  const memberships = await getAvailableStores();
  const multiTenantReady = !memberships.some((membership) => membership.id === "legacy-current-store");

  return (
    <AppShell profile={profile}>
      <PageHeader title="系统设置" description="租户、多门店、环境变量、权限、PWA 和数据初始化入口。" />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-semibold">租户与门店上下文</h2>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                当前系统按租户隔离账号，按门店隔离库存、采购、销售、财务和报表。切换门店后，所有业务页面会进入对应门店的数据范围。
              </p>
            </div>
            <Badge className={`w-fit ${multiTenantReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {multiTenantReady ? "多租户已启用" : "等待执行 migration"}
            </Badge>
          </div>
          {!multiTenantReady ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              当前 Supabase 云数据库还没有执行多租户 SQL。请执行
              <span className="font-mono"> supabase/migrations/018_multi_tenant_foundation.sql </span>
              后，再刷新本页启用真实多门店切换。
            </div>
          ) : null}
          <div className="mt-5 grid gap-4 text-sm md:grid-cols-3">
            <InfoTile label="租户 ID" value={profile.tenant_id} />
            <InfoTile label="当前门店" value={store?.name ?? profile.store_id} />
            <InfoTile label="可访问门店数" value={`${memberships.length}`} />
          </div>
        </section>

        <section className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <h2 className="font-semibold">门店切换</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {memberships.map((membership) => {
              const memberStore = membership.stores;
              const active = membership.store_id === profile.store_id;
              return (
                <form
                  key={membership.id}
                  action={switchCurrentStoreAction}
                  className={`rounded-md border p-4 ${
                    active ? "border-emerald-300 bg-emerald-50/70" : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <input type="hidden" name="store_id" value={membership.store_id} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-stone-950">{memberStore?.name ?? membership.store_id}</div>
                      <div className="mt-1 text-xs text-stone-500">{memberStore?.business_mode ?? "早咖夜酒"}</div>
                    </div>
                    <Badge className={active ? "border-emerald-200 bg-white text-emerald-800" : "border-stone-200 bg-white text-stone-600"}>
                      {active ? "当前" : membership.role === "owner" ? "老板" : "店员"}
                    </Badge>
                  </div>
                  <div className="mt-3 text-xs leading-5 text-stone-500">
                    {memberStore?.address || "未填写地址"}
                  </div>
                  <Button className="mt-4 w-full" variant={active ? "secondary" : "default"} disabled={active}>
                    {active ? "正在使用" : "切换到此门店"}
                  </Button>
                </form>
              );
            })}
          </div>
        </section>

        <form action={updateStoreSettingsAction} className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <h2 className="font-semibold">当前门店设置</h2>
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
        <form action={createStoreAction} className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <h2 className="font-semibold">新增门店</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            新门店会归属到当前租户，老板自动成为该门店 owner。新增后可在上方切换门店并导入对应门店的数据。
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">门店名称</Label>
              <Input id="new-name" name="name" placeholder="例如：Aroma Melody 二店" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-business-mode">经营模式</Label>
              <Input id="new-business-mode" name="business_mode" defaultValue="早咖夜酒" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-timezone">时区</Label>
              <Input id="new-timezone" name="timezone" defaultValue={store?.timezone ?? "Asia/Shanghai"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-address">地址</Label>
              <Input id="new-address" name="address" placeholder="门店地址" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button>创建门店</Button>
          </div>
        </form>
        <section className="rounded-md border border-stone-200 bg-white p-5">
          <h2 className="font-semibold">当前账号</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="姓名" value={profile.display_name} />
            <Row label="角色" value={profile.role === "owner" ? "老板" : "店员"} />
            <Row label="租户 ID" value={profile.tenant_id} />
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
            <Row label="多租户模型" value="tenant + store + membership" />
          </div>
        </section>
        <section className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <h2 className="font-semibold">权限系统</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            管理 owner / staff 的模块权限。导航、页面和服务端动作会逐步统一使用这套权限点。
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/settings/permissions">进入权限系统</Link>
            </Button>
          </div>
        </section>
        <section className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <h2 className="font-semibold">界面内容中心</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            编辑后台菜单名称、拖动菜单顺序、隐藏不需要的入口，并调整老板驾驶舱的指标卡和排行榜展示。
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/settings/interface">进入界面内容中心</Link>
            </Button>
          </div>
        </section>
        <section className="rounded-md border border-stone-200 bg-white p-5 xl:col-span-2">
          <h2 className="font-semibold">界面样式</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            管理主题色、按钮、图标线宽、卡片和表格样式。适合在正式部署前统一系统视觉。
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/settings/ui">进入 UI 样式中心</Link>
            </Button>
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 break-all font-medium text-stone-950">{value}</div>
    </div>
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
