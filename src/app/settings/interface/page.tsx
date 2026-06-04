import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resetInterfaceSettingsAction,
  updateDashboardWidgetSettingsAction,
  updateInterfaceContentAction,
  updateNavigationSettingsAction,
} from "@/lib/actions/settings";
import { requirePermission, requireProfile } from "@/lib/auth";
import { getInterfaceSettings } from "@/lib/data/interface-settings";
import { defaultInterfaceContent } from "@/lib/interface-config";
import { DashboardWidgetConfigForm, NavigationConfigForm, ResetInterfaceButton } from "./sortable-config-form";

export const dynamic = "force-dynamic";

const contentFields = [
  { key: "app_title", label: "系统名称", placeholder: defaultInterfaceContent.app_title },
  { key: "app_subtitle", label: "系统副标题", placeholder: defaultInterfaceContent.app_subtitle },
  { key: "workbench_title", label: "侧边栏工作台说明", placeholder: defaultInterfaceContent.workbench_title },
  { key: "dashboard_title", label: "Dashboard 标题", placeholder: defaultInterfaceContent.dashboard_title },
  { key: "dashboard_description", label: "Dashboard 描述", placeholder: defaultInterfaceContent.dashboard_description },
  { key: "dashboard_hero_eyebrow", label: "Dashboard 主视觉小标题", placeholder: defaultInterfaceContent.dashboard_hero_eyebrow },
  { key: "dashboard_hero_title", label: "Dashboard 主视觉标题", placeholder: defaultInterfaceContent.dashboard_hero_title },
  { key: "dashboard_hero_description", label: "Dashboard 主视觉描述", placeholder: defaultInterfaceContent.dashboard_hero_description },
] as const;

export default async function InterfaceSettingsPage() {
  const profile = await requireProfile();
  requirePermission(profile, "settings.manage");
  const settings = await getInterfaceSettings(profile.store_id);

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="界面内容中心"
        description="编辑后台菜单文案、导航顺序、Dashboard 组件标题和显示状态。配置按当前门店保存，不影响其他门店。"
        action={<ResetInterfaceButton action={resetInterfaceSettingsAction} />}
      />

      <div className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>系统文案</CardTitle>
            <CardDescription>控制侧边栏品牌名称、工作台说明和 Dashboard 页面顶部文案。</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateInterfaceContentAction}>
              <div className="grid gap-4 lg:grid-cols-2">
                {contentFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <Input id={field.key} name={field.key} defaultValue={settings.content[field.key]} placeholder={field.placeholder} />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex justify-end">
                <Button>保存文案</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>左侧菜单</CardTitle>
            <CardDescription>拖动调整顺序，修改显示名称，或隐藏当前门店不需要的菜单入口。</CardDescription>
          </CardHeader>
          <CardContent>
            <NavigationConfigForm items={settings.navigation} action={updateNavigationSettingsAction} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard 组件</CardTitle>
            <CardDescription>拖动调整首页组件顺序，修改卡片标题，或隐藏暂时不用的指标和排行榜。</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardWidgetConfigForm items={settings.dashboardWidgets} action={updateDashboardWidgetSettingsAction} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
