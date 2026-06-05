import { Building2, ShieldCheck } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { ReactiveForm } from "@/components/app/reactive-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createPlatformStoreAction,
  createPlatformTenantAction,
  switchPlatformCurrentStoreAction,
  updatePlatformStoreAction,
  updatePlatformStoreStatusAction,
  updatePlatformTenantAction,
  updateStoreModuleEntitlementAction,
} from "@/lib/actions/platform";
import { requirePlatformAdmin, requireProfile } from "@/lib/auth";
import { getPlatformDashboardData } from "@/lib/data/platform";
import { platformModules } from "@/lib/platform";
import type { PlatformStoreOverview, Tenant } from "@/lib/types";
import { PlatformCurrentStoreSwitchForm, StoreModuleEntitlementCells, StoreModuleQuickForm, StoreStatusControl } from "./platform-live-controls";

export const dynamic = "force-dynamic";

const statusLabels = {
  active: "启用",
  inactive: "暂停",
  disabled: "停用",
} as const;

export default async function PlatformPage() {
  const profile = await requireProfile();
  requirePlatformAdmin(profile);
  const data = await getPlatformDashboardData();
  const activeStores = data.stores.filter((store) => store.status === "active");
  const entitlementCount = data.entitlements.filter((item) => item.enabled).length;

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="平台管理后台"
        description="系统拥有者使用的跨租户后台，用于管理租户、门店状态和每家门店可使用的系统模块。"
      />

      {!data.adminReady ? (
        <Card className="mb-5 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle>平台后台需要 Service Role</CardTitle>
            <CardDescription className="text-amber-900">
              当前账号已具备平台入口，但跨租户查询需要配置 `SUPABASE_SERVICE_ROLE_KEY`。配置后刷新本页即可看到全部租户和门店。
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Metric label="租户数量" value={`${data.tenants.length}`} />
        <Metric label="门店数量" value={`${data.stores.length}`} />
        <Metric label="启用门店" value={`${activeStores.length}`} />
        <Metric label="已开通模块记录" value={`${entitlementCount}`} />
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>新增租户</CardTitle>
            <CardDescription>为新的咖啡店品牌或经营主体创建独立租户。</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactiveForm action={createPlatformTenantAction} className="grid gap-4" successText="租户已创建">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">租户名称</Label>
                  <Input id="tenant-name" name="name" placeholder="例如 Aroma Melody" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenant-slug">租户标识</Label>
                  <Input id="tenant-slug" name="slug" placeholder="aroma-melody" required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="tenant-status">状态</Label>
                  <Select id="tenant-status" name="status" defaultValue="active">
                    <option value="active">启用</option>
                    <option value="inactive">暂停</option>
                    <option value="disabled">停用</option>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button>创建租户</Button>
              </div>
            </ReactiveForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>新增门店</CardTitle>
            <CardDescription>平台直接为任意租户开新门店，并自动授予平台账号 owner 成员关系。</CardDescription>
          </CardHeader>
          <CardContent>
            <ReactiveForm action={createPlatformStoreAction} className="grid gap-4" successText="门店已创建">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="store-tenant-id">所属租户</Label>
                  <Select id="store-tenant-id" name="tenant_id" required disabled={data.tenants.length === 0}>
                    <option value="">选择租户</option>
                    {data.tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} / {tenant.slug}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-name">门店名称</Label>
                  <Input id="store-name" name="name" placeholder="例如 社区二楼店" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-business-mode">经营模式</Label>
                  <Input id="store-business-mode" name="business_mode" defaultValue="早咖夜酒" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-timezone">时区</Label>
                  <Input id="store-timezone" name="timezone" defaultValue="Asia/Shanghai" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-status">状态</Label>
                  <Select id="store-status" name="status" defaultValue="active">
                    <option value="active">启用</option>
                    <option value="inactive">暂停</option>
                    <option value="disabled">停用</option>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="store-address">地址</Label>
                  <Input id="store-address" name="address" placeholder="门店地址" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button disabled={data.tenants.length === 0}>创建门店</Button>
              </div>
            </ReactiveForm>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>平台账号当前门店切换</CardTitle>
          <CardDescription>
            系统拥有者可以直接把当前登录账号切换到任意启用门店，用于验收该门店的数据、权限、导入和报表。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeStores.length === 0 ? (
            <EmptyState title="暂无可切换门店" description="启用至少一家门店后，平台账号可以直接进入该门店上下文。" />
          ) : (
            <PlatformCurrentStoreSwitchForm
              currentStoreId={profile.store_id}
              stores={data.stores.map((store) => ({
                id: store.id,
                label: `${store.tenants?.name ?? store.tenant_id} · ${store.name}`,
                status: store.status,
              }))}
              action={switchPlatformCurrentStoreAction}
            />
          )}
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>租户管理</CardTitle>
          <CardDescription>维护租户名称、标识和启停状态。停用租户不会物理删除历史数据。</CardDescription>
        </CardHeader>
        <CardContent>
          {data.tenants.length === 0 ? (
            <EmptyState title="暂无租户" description="创建租户后可以继续创建门店并开通模块。" />
          ) : (
            <div className="grid gap-3">
              {data.tenants.map((tenant) => (
                <TenantEditForm key={tenant.id} tenant={tenant} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--brand)]" />
              平台权限模型
            </CardTitle>
            <CardDescription>平台拥有者高于租户老板，但不改变业务数据的门店隔离。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-stone-600">
            <Info label="平台拥有者" value="跨租户管理" />
            <Info label="租户老板" value="管理本租户门店" />
            <Info label="门店成员" value="按门店权限使用" />
            <Info label="模块开通" value={`${platformModules.length} 个模块`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[var(--brand)]" />
              租户与门店
            </CardTitle>
            <CardDescription>门店状态由平台控制；租户内权限仍由老板在权限系统里分配。</CardDescription>
          </CardHeader>
          <CardContent>
            {data.stores.length === 0 ? (
              <EmptyState title="暂无门店" description="执行多租户初始化并创建门店后，这里会显示平台门店总览。" />
            ) : (
              <TableContainer>
                <Table className="min-w-[880px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>租户</TableHead>
                      <TableHead>门店</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>成员数</TableHead>
                      <TableHead>模块</TableHead>
                      <TableHead className="text-right">平台操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.stores.map((store) => (
                      <StoreRow key={store.id} store={store} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>门店模块开通</CardTitle>
          <CardDescription>选择门店和模块，设置启用或关闭。未配置的模块默认视为启用，适合先快速上线，后续再按套餐收紧。</CardDescription>
        </CardHeader>
        <CardContent>
          <StoreModuleQuickForm
            stores={data.stores.map((store) => ({
              id: store.id,
              label: `${store.tenants?.name ?? store.tenant_id} · ${store.name}`,
            }))}
            modules={platformModules.map((module) => ({ key: module.key, name: module.name }))}
            action={updateStoreModuleEntitlementAction}
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {platformModules.map((module) => (
              <div key={module.key} className="rounded-md border border-[var(--line)] bg-white/70 p-4">
                <div className="text-sm font-semibold text-stone-950">{module.name}</div>
                <div className="mt-1 font-mono text-xs text-stone-400">{module.key}</div>
                <p className="mt-2 text-xs leading-5 text-stone-500">{module.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>门店详情与模块矩阵</CardTitle>
          <CardDescription>逐店查看每个模块的开通状态、备注和最近更新时间。默认开通表示尚未写入单独配置。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {data.stores.length === 0 ? (
            <EmptyState title="暂无门店详情" description="创建门店后，这里会显示逐店模块矩阵。" />
          ) : (
            data.stores.map((store) => <StoreModuleMatrix key={store.id} store={store} />)
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StoreRow({ store }: { store: PlatformStoreOverview }) {
  const memberCount = store.store_memberships?.filter((membership) => membership.status === "active").length ?? 0;
  const disabledModules = store.store_module_entitlements?.filter((item) => !item.enabled).map((item) => item.module_key) ?? [];

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{store.tenants?.name ?? store.tenant_id}</div>
        <div className="mt-1 font-mono text-xs text-stone-400">{store.tenants?.slug ?? store.tenant_id}</div>
      </TableCell>
      <TableCell>
        <div className="font-medium">{store.name}</div>
        <div className="mt-1 text-xs text-stone-500">{store.address || "未填写地址"}</div>
      </TableCell>
      <TableCell>
        <Badge variant={store.status === "active" ? "success" : store.status === "disabled" ? "danger" : "warning"}>
          {statusLabels[store.status]}
        </Badge>
      </TableCell>
      <TableCell>{memberCount}</TableCell>
      <TableCell>
        {disabledModules.length === 0 ? (
          <Badge variant="success">默认全开</Badge>
        ) : (
          <div className="max-w-[260px] text-xs leading-5 text-stone-500">已关闭：{disabledModules.join("、")}</div>
        )}
      </TableCell>
      <TableCell>
        <StoreStatusControl storeId={store.id} initialStatus={store.status} action={updatePlatformStoreStatusAction} />
      </TableCell>
    </TableRow>
  );
}

function StoreModuleMatrix({ store }: { store: PlatformStoreOverview }) {
  const entitlementByModule = new Map((store.store_module_entitlements ?? []).map((item) => [item.module_key, item]));
  const enabledCount = platformModules.filter((module) => entitlementByModule.get(module.key)?.enabled ?? true).length;
  const disabledCount = platformModules.length - enabledCount;

  return (
    <section className="overflow-hidden rounded-md border border-[var(--line)] bg-white/70">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-stone-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-stone-950">{store.name}</h3>
            <Badge variant={store.status === "active" ? "success" : store.status === "disabled" ? "danger" : "warning"}>
              {statusLabels[store.status]}
            </Badge>
          </div>
          <div className="mt-1 text-sm text-stone-500">
            {store.tenants?.name ?? store.tenant_id} · {store.address || "未填写地址"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="success">开通 {enabledCount}</Badge>
          <Badge variant={disabledCount > 0 ? "warning" : "muted"}>关闭 {disabledCount}</Badge>
        </div>
      </div>

      <div className="border-b border-[var(--line)] px-4 py-4">
        <StoreEditForm store={store} />
      </div>

      <TableContainer className="rounded-none border-0 shadow-none">
        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow>
              <TableHead>模块</TableHead>
              <TableHead>当前状态</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">调整</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {platformModules.map((module) => {
              const entitlement = entitlementByModule.get(module.key);
              return (
                <TableRow key={`${store.id}:${module.key}`}>
                  <TableCell>
                    <div className="font-medium text-stone-950">{module.name}</div>
                    <div className="mt-1 font-mono text-xs text-stone-400">{module.key}</div>
                    <p className="mt-1 max-w-md text-xs leading-5 text-stone-500">{module.description}</p>
                  </TableCell>
                  <StoreModuleEntitlementCells
                    storeId={store.id}
                    moduleKey={module.key}
                    entitlement={entitlement}
                    action={updateStoreModuleEntitlementAction}
                  />
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </section>
  );
}

function TenantEditForm({ tenant }: { tenant: Tenant }) {
  return (
    <ReactiveForm action={updatePlatformTenantAction} className="rounded-md border border-[var(--line)] bg-white p-4" successText="租户已更新">
      <input type="hidden" name="tenant_id" value={tenant.id} />
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_130px_auto] lg:items-end">
        <div className="space-y-1">
          <Label htmlFor={`tenant-name-${tenant.id}`}>租户名称</Label>
          <Input id={`tenant-name-${tenant.id}`} name="name" defaultValue={tenant.name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tenant-slug-${tenant.id}`}>租户标识</Label>
          <Input id={`tenant-slug-${tenant.id}`} name="slug" defaultValue={tenant.slug} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tenant-status-${tenant.id}`}>状态</Label>
          <Select id={`tenant-status-${tenant.id}`} name="status" defaultValue={tenant.status}>
            <option value="active">启用</option>
            <option value="inactive">暂停</option>
            <option value="disabled">停用</option>
          </Select>
        </div>
        <Button size="sm">保存租户</Button>
      </div>
    </ReactiveForm>
  );
}

function StoreEditForm({ store }: { store: PlatformStoreOverview }) {
  return (
    <ReactiveForm action={updatePlatformStoreAction} className="grid gap-3" successText="门店资料已更新">
      <input type="hidden" name="store_id" value={store.id} />
      <input type="hidden" name="tenant_id" value={store.tenant_id} />
      <div className="grid gap-3 lg:grid-cols-[1fr_140px_160px_130px_auto] lg:items-end">
        <div className="space-y-1">
          <Label htmlFor={`store-name-${store.id}`}>门店名称</Label>
          <Input id={`store-name-${store.id}`} name="name" defaultValue={store.name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`store-mode-${store.id}`}>经营模式</Label>
          <Input id={`store-mode-${store.id}`} name="business_mode" defaultValue={store.business_mode} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`store-timezone-${store.id}`}>时区</Label>
          <Input id={`store-timezone-${store.id}`} name="timezone" defaultValue={store.timezone} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`store-status-${store.id}`}>状态</Label>
          <Select id={`store-status-${store.id}`} name="status" defaultValue={store.status}>
            <option value="active">启用</option>
            <option value="inactive">暂停</option>
            <option value="disabled">停用</option>
          </Select>
        </div>
        <Button size="sm">保存门店</Button>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`store-address-${store.id}`}>地址</Label>
        <Input id={`store-address-${store.id}`} name="address" defaultValue={store.address ?? ""} />
      </div>
    </ReactiveForm>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--card)] p-4">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-stone-950">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] bg-stone-50 px-3 py-2">
      <span>{label}</span>
      <span className="font-medium text-stone-950">{value}</span>
    </div>
  );
}
