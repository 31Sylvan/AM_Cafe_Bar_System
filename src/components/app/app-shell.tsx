import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  PackagePlus,
  Upload,
  ReceiptText,
  ShoppingCart,
  Store,
  TriangleAlert,
  Users,
  WalletCards,
} from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard, roles: ["owner", "staff"] },
  { href: "/inventory/items", label: "库存中心", icon: Package, roles: ["owner", "staff"] },
  { href: "/purchases", label: "采购管理", icon: ShoppingCart, roles: ["owner", "staff"] },
  { href: "/products", label: "产品配方", icon: Store, roles: ["owner", "staff"] },
  { href: "/sales", label: "销售录入", icon: ReceiptText, roles: ["owner", "staff"] },
  { href: "/waste", label: "损耗管理", icon: PackagePlus, roles: ["owner", "staff"] },
  { href: "/stock-counts", label: "盘点管理", icon: ClipboardList, roles: ["owner", "staff"] },
  { href: "/finance", label: "财务中心", icon: WalletCards, roles: ["owner"] },
  { href: "/employees", label: "员工管理", icon: Users, roles: ["owner"] },
  { href: "/shifts", label: "排班管理", icon: ClipboardList, roles: ["owner", "staff"] },
  { href: "/performance", label: "员工绩效", icon: BarChart3, roles: ["owner"] },
  { href: "/commissions", label: "提成系统", icon: WalletCards, roles: ["owner"] },
  { href: "/quality", label: "数据质量", icon: TriangleAlert, roles: ["owner"] },
  { href: "/imports", label: "导入预检", icon: Upload, roles: ["owner"] },
  { href: "/backup", label: "数据备份", icon: Archive, roles: ["owner"] },
  { href: "/inventory/movements", label: "库存流水", icon: ClipboardList, roles: ["owner", "staff"] },
  { href: "/inventory/alerts", label: "库存预警", icon: AlertTriangle, roles: ["owner", "staff"] },
  { href: "/reports", label: "报表中心", icon: BarChart3, roles: ["owner", "staff"] },
  { href: "/settings", label: "系统设置", icon: Store, roles: ["owner"] },
];

export function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile | null }) {
  const visibleNavItems = navItems.filter((item) => !profile || item.roles.includes(profile.role));
  const demoMode = !hasSupabaseEnv();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white lg:block">
        <div className="flex h-16 items-center border-b border-stone-200 px-5">
          <div>
            <div className="text-base font-semibold">Coffee Shop OS</div>
            <div className="text-xs text-stone-500">Aroma Melody</div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-950"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur lg:px-8">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-stone-900">
              {profile?.display_name ?? "未连接 Supabase"}
            </div>
            <div className="text-xs text-stone-500">
              {profile ? (profile.role === "owner" ? "老板账号" : "店员账号") : "请配置环境变量后登录"}
            </div>
          </div>
          <form action={signOutAction}>
            <Button variant="secondary" size="sm">
              <LogOut className="h-4 w-4" />
              退出
            </Button>
          </form>
        </header>

        <main className="px-4 py-6 lg:px-8">
          {demoMode ? (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              当前为本地 Demo 模式：页面展示样例数据，表单提交只做流程跳转，不会写入真实数据库。
            </div>
          ) : null}
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-stone-200 bg-white lg:hidden">
          {visibleNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex h-14 flex-col items-center justify-center gap-1 text-xs text-stone-600">
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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-stone-950">{title}</h1>
        {description ? <p className="mt-1 text-sm text-stone-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon = ReceiptText, title, description }: { icon?: typeof ReceiptText; title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed border-stone-300 bg-white p-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-stone-400" />
      <h2 className="mt-3 text-sm font-semibold text-stone-900">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </div>
  );
}
