import { AppShell, PageHeader } from "@/components/app/app-shell";
import { requirePermission, requireProfile } from "@/lib/auth";
import { ThemeStudio } from "./theme-studio";

export const dynamic = "force-dynamic";

export default async function UiSettingsPage() {
  const profile = await requireProfile();
  requirePermission(profile, "theme.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="UI 样式中心"
        description="管理系统主题、按钮样式、图标线宽、表格和卡片视觉。当前版本保存到本机浏览器，适合先确定设计方向。"
      />
      <ThemeStudio />
    </AppShell>
  );
}
