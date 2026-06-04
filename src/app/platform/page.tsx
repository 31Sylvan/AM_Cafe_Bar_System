import { Building2, ShieldCheck } from "lucide-react";
import { AppShell, EmptyState, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updatePlatformStoreStatusAction, updateStoreModuleEntitlementAction } from "@/lib/actions/platform";
import { requirePlatformAdmin, requireProfile } from "@/lib/auth";
import { getPlatformDashboardData } from "@/lib/data/platform";
import { platformModules } from "@/lib/platform";
import type { PlatformStoreOverview } from "@/lib/types";

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
          <form action={updateStoreModuleEntitlementAction} className="grid gap-3 lg:grid-cols-[1.2fr_1fr_160px_1.4fr_auto]">
            <Select name="store_id" required>
              <option value="">选择门店</option>
              {data.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.tenants?.name ?? store.tenant_id} · {store.name}
                </option>
              ))}
            </Select>
            <Select name="module_key" required>
              <option value="">选择模块</option>
              {platformModules.map((module) => (
                <option key={module.key} value={module.key}>
                  {module.name}
                </option>
              ))}
            </Select>
            <Select name="enabled" defaultValue="true" required>
              <option value="true">开通</option>
              <option value="false">关闭</option>
            </Select>
            <Input name="note" placeholder="备注，例如：专业版套餐" />
            <Button>保存开通</Button>
          </form>

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
      <TableCell className="text-right">
        <form action={updatePlatformStoreStatusAction} className="flex justify-end gap-2">
          <input type="hidden" name="store_id" value={store.id} />
          <Select name="status" defaultValue={store.status} className="w-28">
            <option value="active">启用</option>
            <option value="inactive">暂停</option>
            <option value="disabled">停用</option>
          </Select>
          <Button size="sm" variant="secondary">保存</Button>
        </form>
      </TableCell>
    </TableRow>
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
