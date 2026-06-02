import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Upload,
  ReceiptText,
  ShoppingCart,
  Store,
  Palette,
  TriangleAlert,
  Users,
  WalletCards,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { hasPermission, type PermissionKey } from "@/lib/permissions";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/inventory/items", label: "库存中心", icon: Package, permission: "inventory.view" },
  { href: "/purchases", label: "采购管理", icon: ShoppingCart, permission: "purchase.view" },
  { href: "/products", label: "产品配方", icon: Store, permission: "product.view" },
  { href: "/sales", label: "销售录入", icon: ReceiptText, permission: "sales.view" },
  { href: "/waste", label: "损耗管理", icon: PackagePlus, permission: "waste.view" },
  { href: "/stock-counts", label: "盘点管理", icon: ClipboardList, permission: "stock_count.view" },
  { href: "/finance", label: "财务中心", icon: WalletCards, permission: "finance.view" },
  { href: "/employees", label: "员工管理", icon: Users, permission: "employee.view" },
  { href: "/shifts", label: "排班管理", icon: ClipboardList, permission: "shift.view" },
  { href: "/performance", label: "员工绩效", icon: BarChart3, permission: "performance.view" },
  { href: "/commissions", label: "提成系统", icon: WalletCards, permission: "commission.manage" },
  { href: "/quality", label: "数据质量", icon: TriangleAlert, permission: "quality.view" },
  { href: "/imports", label: "导入预检", icon: Upload, permission: "import.manage" },
  { href: "/backup", label: "数据备份", icon: Archive, permission: "backup.manage" },
  { href: "/inventory/movements", label: "库存流水", icon: ClipboardList, permission: "inventory.view" },
  { href: "/inventory/alerts", label: "库存预警", icon: AlertTriangle, permission: "inventory.view" },
  { href: "/reports", label: "报表中心", icon: BarChart3, permission: "report.view" },
  { href: "/settings/ui", label: "UI样式", icon: Palette, permission: "theme.manage" },
  { href: "/settings/permissions", label: "权限系统", icon: Users, permission: "permission.manage" },
  { href: "/settings", label: "系统设置", icon: Store, permission: "settings.manage" },
] satisfies Array<{ href: string; label: string; icon: typeof LayoutDashboard; permission: PermissionKey }>;

export function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile | null }) {
  const visibleNavItems = navItems.filter((item) => !profile || hasPermission(profile, item.permission));
  const demoMode = !hasSupabaseEnv();

  return (
    <div className="min-h-screen bg-[var(--background)] text-stone-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-black/20 bg-[var(--brand)] text-stone-50 shadow-2xl lg:block">
        <div className="flex h-20 items-center border-b border-white/10 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-lg font-black text-[var(--brand)] shadow-sm">
            AM
          </div>
          <div className="ml-3 min-w-0">
            <div className="truncate text-base font-semibold tracking-normal">Coffee Shop OS</div>
            <div className="mt-0.5 text-xs text-stone-300">Aroma Melody Cafe & Bar</div>
          </div>
        </div>
        <div className="border-b border-white/10 px-5 py-4">
          <div className="rounded-md bg-white/8 px-3 py-3">
            <div className="text-xs text-stone-300">今日工作台</div>
            <div className="mt-1 text-sm font-medium text-white">库存、订单、现金流联动</div>
          </div>
        </div>
        <nav className="h-[calc(100vh-160px)] space-y-1 overflow-y-auto px-3 py-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium text-stone-200 transition hover:bg-white/10 hover:text-white"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-md)] bg-white/8">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)] px-4 backdrop-blur-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand)] text-stone-50 lg:hidden">
              <Menu className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-stone-950">
                {profile?.display_name ?? "未连接 Supabase"}
              </div>
              <div className="text-xs text-stone-500">
                {profile ? (profile.role === "owner" ? "老板账号 · 全部经营权限" : "店员账号 · 运营录入权限") : "请配置环境变量后登录"}
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_70%,white)] px-3 py-2 text-xs text-stone-600">
              多门店 · 当前门店上下文
            </div>
            <form action={signOutAction}>
              <Button variant="secondary" size="sm">
                <LogOut className="h-4 w-4" />
                退出
              </Button>
            </form>
          </div>
          <form action={signOutAction} className="md:hidden">
            <Button variant="secondary" size="sm">
              <LogOut className="h-4 w-4" />
              退出
            </Button>
          </form>
        </header>

        <main className="min-h-[calc(100vh-64px)] px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          {demoMode ? (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
              当前为本地 Demo 模式：页面展示样例数据，表单提交只做流程跳转，不会写入真实数据库。
            </div>
          ) : null}
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_95%,transparent)] shadow-[0_-8px_24px_rgba(45,28,18,0.08)] backdrop-blur lg:hidden">
          {visibleNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex h-14 flex-col items-center justify-center gap-1 text-xs font-medium text-stone-600">
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 h-1.5 w-10 rounded-full bg-[var(--accent)]" />
        <h1 className="text-2xl font-semibold tracking-normal text-stone-950 md:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon = ReceiptText, title, description }: { icon?: typeof ReceiptText; title: string; description: string }) {
  return (
    <div className="app-card rounded-md border-dashed p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-soft)]">
        <Icon className="h-6 w-6 text-[var(--brand)]" />
      </div>
      <h2 className="mt-3 text-sm font-semibold text-stone-900">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </div>
  );
}
