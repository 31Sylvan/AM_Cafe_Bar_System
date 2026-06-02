import { ShieldCheck } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { requirePermission, requireProfile } from "@/lib/auth";
import { deleteMemberPermissionOverrideAction, updateRolePermissionsAction, upsertMemberPermissionOverrideAction } from "@/lib/actions/permissions";
import { getPermissionManagementData } from "@/lib/data/permissions";
import { groupPermissionsByModule } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PermissionSettingsPage() {
  const profile = await requireProfile();
  requirePermission(profile, "permission.manage");
  const { rolePermissions, memberships, overrides } = await getPermissionManagementData();
  const grouped = groupPermissionsByModule();
  const staffPermissionSet = new Set(rolePermissions.staff);
  const editableMemberships = memberships.filter((membership) => membership.status === "active");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="权限系统"
        description="管理每个角色能查看和操作哪些模块。当前版本内置 owner 与 staff，后续可以继续扩展自定义角色和成员级覆盖。"
      />

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--brand)]" />
              权限模型
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-stone-600">
            <p>
              系统权限由三层组成：租户、门店成员、权限点。业务数据继续按当前门店隔离，权限点决定用户能否进入页面或执行动作。
            </p>
            <div className="space-y-2">
              <Info label="老板 owner" value="默认全部权限" />
              <Info label="店员 staff" value="可按模块开放" />
              <Info label="当前权限点" value={`${grouped.reduce((total, group) => total + group.permissions.length, 0)} 个`} />
            </div>
          </CardContent>
        </Card>

        <form action={updateRolePermissionsAction} className="space-y-5">
          <input type="hidden" name="role" value="staff" />
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>店员权限</CardTitle>
                <p className="mt-2 text-sm text-stone-500">
                  勾选后，所有 staff 成员会获得对应能力；财务、员工绩效、系统设置默认不开放。
                </p>
              </div>
              <Button>保存店员权限</Button>
            </CardHeader>
          </Card>

          {grouped.map((group) => (
            <Card key={group.module}>
              <CardHeader className="border-b border-[var(--line)]">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>{group.module}</span>
                  <Badge>{group.permissions.length} 项</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
                {group.permissions.map((permission) => {
                  const checked = staffPermissionSet.has(permission.key);
                  const locked = permission.key === "dashboard.view";
                  return (
                    <label
                      key={permission.key}
                      className="flex min-h-24 gap-3 rounded-md border border-stone-200 bg-stone-50 p-4 transition hover:border-[var(--accent)] hover:bg-white"
                    >
                      <input
                        className="mt-1 h-4 w-4 accent-[var(--brand)]"
                        type="checkbox"
                        name="permissions"
                        value={permission.key}
                        defaultChecked={checked || locked}
                        disabled={locked}
                      />
                      {locked ? <input type="hidden" name="permissions" value={permission.key} /> : null}
                      <span className="min-w-0">
                        <span className="block font-medium text-stone-950">{permission.name}</span>
                        <span className="mt-1 block text-xs font-mono text-stone-400">{permission.key}</span>
                        <span className="mt-2 block text-sm leading-5 text-stone-500">{permission.description}</span>
                      </span>
                    </label>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </form>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>成员权限覆盖</CardTitle>
          <p className="mt-2 text-sm text-stone-500">
            覆盖规则优先级高于角色权限。允许可以给某个成员额外开权限，禁止可以关闭某个成员从角色继承来的权限。
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <form action={upsertMemberPermissionOverrideAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_160px_auto]">
            <Select name="profile_id" required>
              <option value="">选择成员</option>
              {editableMemberships.map((membership) => (
                <option key={`${membership.store_id}:${membership.profile_id}`} value={membership.profile_id}>
                  {membership.profiles?.display_name ?? membership.profile_id} · {membership.stores?.name ?? membership.store_id}
                </option>
              ))}
            </Select>
            <Select name="store_id" required>
              <option value="">选择门店</option>
              {editableMemberships.map((membership) => (
                <option key={membership.id} value={membership.store_id}>
                  {membership.stores?.name ?? membership.store_id}
                </option>
              ))}
            </Select>
            <Select name="permission_key" required>
              <option value="">选择权限点</option>
              {grouped.map((group) => (
                <optgroup key={group.module} label={group.module}>
                  {group.permissions.map((permission) => (
                    <option key={permission.key} value={permission.key}>
                      {permission.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
            <Select name="effect" required defaultValue="deny">
              <option value="deny">禁止</option>
              <option value="allow">允许</option>
            </Select>
            <Button>保存覆盖</Button>
          </form>

          {overrides.length === 0 ? (
            <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
              目前没有成员级权限覆盖，所有成员按角色权限生效。
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-stone-200">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead className="bg-stone-100 text-xs font-medium text-stone-500">
                  <tr>
                    <th className="px-4 py-3">成员</th>
                    <th className="px-4 py-3">门店</th>
                    <th className="px-4 py-3">权限</th>
                    <th className="px-4 py-3">效果</th>
                    <th className="px-4 py-3">更新时间</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white">
                  {overrides.map((override) => {
                    const permission = grouped.flatMap((group) => group.permissions).find((item) => item.key === override.permission_key);
                    return (
                      <tr key={`${override.store_id}:${override.profile_id}:${override.permission_key}`}>
                        <td className="px-4 py-3 font-medium">{override.profiles?.display_name ?? override.profile_id}</td>
                        <td className="px-4 py-3">{override.stores?.name ?? override.store_id}</td>
                        <td className="px-4 py-3">
                          <div>{permission?.name ?? override.permission_key}</div>
                          <div className="mt-1 font-mono text-xs text-stone-400">{override.permission_key}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={override.effect === "allow" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}>
                            {override.effect === "allow" ? "允许" : "禁止"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-stone-500">{new Date(override.updated_at).toLocaleString("zh-CN")}</td>
                        <td className="px-4 py-3 text-right">
                          <form action={deleteMemberPermissionOverrideAction}>
                            <input type="hidden" name="store_id" value={override.store_id} />
                            <input type="hidden" name="profile_id" value={override.profile_id} />
                            <input type="hidden" name="permission_key" value={override.permission_key} />
                            <Button size="sm" variant="secondary">移除</Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
      <span className="text-stone-500">{label}</span>
      <span className="font-medium text-stone-900">{value}</span>
    </div>
  );
}
