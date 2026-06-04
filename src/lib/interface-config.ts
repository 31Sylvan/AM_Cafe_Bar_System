import type { PermissionKey } from "@/lib/permissions";

export type NavigationItemKey =
  | "platform"
  | "dashboard"
  | "inventory"
  | "purchases"
  | "products"
  | "sales"
  | "waste"
  | "stock_counts"
  | "finance"
  | "employees"
  | "shifts"
  | "performance"
  | "commissions"
  | "quality"
  | "imports"
  | "backup"
  | "inventory_movements"
  | "inventory_alerts"
  | "reports"
  | "interface"
  | "ui"
  | "permissions"
  | "settings";

export type NavigationDefinition = {
  key: NavigationItemKey;
  href: string;
  defaultLabel: string;
  icon: string;
  permission: PermissionKey;
  defaultPosition: number;
};

export type DashboardWidgetKey =
  | "metric.today_revenue"
  | "metric.month_revenue"
  | "metric.gross_margin"
  | "metric.material_cost_rate"
  | "metric.inventory_value"
  | "metric.low_stock"
  | "metric.month_purchases"
  | "metric.waste_rate"
  | "metric.cash_balance"
  | "metric.estimated_month_profit"
  | "panel.low_stock_alerts"
  | "panel.recent_inventory_movements"
  | "ranking.product_sales"
  | "ranking.product_profit"
  | "ranking.employee_efficiency";

export type DashboardWidgetDefinition = {
  key: DashboardWidgetKey;
  zone: "metric" | "panel" | "ranking";
  defaultTitle: string;
  defaultPosition: number;
};

export type NavigationSetting = NavigationDefinition & {
  label: string;
  position: number;
  hidden: boolean;
  updated_at?: string | null;
};

export type DashboardWidgetSetting = DashboardWidgetDefinition & {
  title: string;
  position: number;
  hidden: boolean;
  updated_at?: string | null;
};

export type InterfaceContentSettings = {
  app_title: string;
  app_subtitle: string;
  workbench_title: string;
  dashboard_title: string;
  dashboard_description: string;
  dashboard_hero_eyebrow: string;
  dashboard_hero_title: string;
  dashboard_hero_description: string;
};

export const defaultInterfaceContent: InterfaceContentSettings = {
  app_title: "Coffee Shop OS",
  app_subtitle: "Aroma Melody Cafe & Bar",
  workbench_title: "库存、订单、现金流联动",
  dashboard_title: "老板驾驶舱",
  dashboard_description: "库存、销售、损耗、成本、现金流、员工绩效和报表已统一接入经营指标。",
  dashboard_hero_eyebrow: "Aroma Melody 经营概览",
  dashboard_hero_title: "早咖夜酒的一天，从库存和现金流开始。",
  dashboard_hero_description: "导入真实订单、采购和配方后，这里会自动汇总营业额、毛利、库存风险和预计利润。",
};

export const navigationDefinitions = [
  { key: "platform", href: "/platform", defaultLabel: "平台后台", icon: "Building2", permission: "platform.manage", defaultPosition: 10 },
  { key: "dashboard", href: "/dashboard", defaultLabel: "仪表盘", icon: "LayoutDashboard", permission: "dashboard.view", defaultPosition: 20 },
  { key: "inventory", href: "/inventory/items", defaultLabel: "库存中心", icon: "Package", permission: "inventory.view", defaultPosition: 30 },
  { key: "purchases", href: "/purchases", defaultLabel: "采购管理", icon: "ShoppingCart", permission: "purchase.view", defaultPosition: 40 },
  { key: "products", href: "/products", defaultLabel: "产品配方", icon: "Store", permission: "product.view", defaultPosition: 50 },
  { key: "sales", href: "/sales", defaultLabel: "销售录入", icon: "ReceiptText", permission: "sales.view", defaultPosition: 60 },
  { key: "waste", href: "/waste", defaultLabel: "损耗管理", icon: "PackagePlus", permission: "waste.view", defaultPosition: 70 },
  { key: "stock_counts", href: "/stock-counts", defaultLabel: "盘点管理", icon: "ClipboardList", permission: "stock_count.view", defaultPosition: 80 },
  { key: "finance", href: "/finance", defaultLabel: "财务中心", icon: "WalletCards", permission: "finance.view", defaultPosition: 90 },
  { key: "employees", href: "/employees", defaultLabel: "员工管理", icon: "Users", permission: "employee.view", defaultPosition: 100 },
  { key: "shifts", href: "/shifts", defaultLabel: "排班管理", icon: "ClipboardList", permission: "shift.view", defaultPosition: 110 },
  { key: "performance", href: "/performance", defaultLabel: "员工绩效", icon: "BarChart3", permission: "performance.view", defaultPosition: 120 },
  { key: "commissions", href: "/commissions", defaultLabel: "提成系统", icon: "WalletCards", permission: "commission.manage", defaultPosition: 130 },
  { key: "quality", href: "/quality", defaultLabel: "数据质量", icon: "TriangleAlert", permission: "quality.view", defaultPosition: 140 },
  { key: "imports", href: "/imports", defaultLabel: "导入预检", icon: "Upload", permission: "import.manage", defaultPosition: 150 },
  { key: "backup", href: "/backup", defaultLabel: "数据备份", icon: "Archive", permission: "backup.manage", defaultPosition: 160 },
  { key: "inventory_movements", href: "/inventory/movements", defaultLabel: "库存流水", icon: "ClipboardList", permission: "inventory.view", defaultPosition: 170 },
  { key: "inventory_alerts", href: "/inventory/alerts", defaultLabel: "库存预警", icon: "AlertTriangle", permission: "inventory.view", defaultPosition: 180 },
  { key: "reports", href: "/reports", defaultLabel: "报表中心", icon: "BarChart3", permission: "report.view", defaultPosition: 190 },
  { key: "interface", href: "/settings/interface", defaultLabel: "界面内容", icon: "PanelTop", permission: "settings.manage", defaultPosition: 200 },
  { key: "ui", href: "/settings/ui", defaultLabel: "UI样式", icon: "Palette", permission: "theme.manage", defaultPosition: 210 },
  { key: "permissions", href: "/settings/permissions", defaultLabel: "权限系统", icon: "Users", permission: "permission.manage", defaultPosition: 220 },
  { key: "settings", href: "/settings", defaultLabel: "系统设置", icon: "Store", permission: "settings.manage", defaultPosition: 230 },
] satisfies NavigationDefinition[];

export const dashboardWidgetDefinitions = [
  { key: "metric.today_revenue", zone: "metric", defaultTitle: "今日营业额", defaultPosition: 10 },
  { key: "metric.month_revenue", zone: "metric", defaultTitle: "本月营业额", defaultPosition: 20 },
  { key: "metric.gross_margin", zone: "metric", defaultTitle: "本月毛利率", defaultPosition: 30 },
  { key: "metric.material_cost_rate", zone: "metric", defaultTitle: "原料成本率", defaultPosition: 40 },
  { key: "metric.inventory_value", zone: "metric", defaultTitle: "库存价值", defaultPosition: 50 },
  { key: "metric.low_stock", zone: "metric", defaultTitle: "库存预警", defaultPosition: 60 },
  { key: "metric.month_purchases", zone: "metric", defaultTitle: "本月采购额", defaultPosition: 70 },
  { key: "metric.waste_rate", zone: "metric", defaultTitle: "损耗率", defaultPosition: 80 },
  { key: "metric.cash_balance", zone: "metric", defaultTitle: "现金余额", defaultPosition: 90 },
  { key: "metric.estimated_month_profit", zone: "metric", defaultTitle: "预计月利润", defaultPosition: 100 },
  { key: "panel.low_stock_alerts", zone: "panel", defaultTitle: "低库存预警", defaultPosition: 10 },
  { key: "panel.recent_inventory_movements", zone: "panel", defaultTitle: "最近库存流水", defaultPosition: 20 },
  { key: "ranking.product_sales", zone: "ranking", defaultTitle: "产品销量排行榜", defaultPosition: 10 },
  { key: "ranking.product_profit", zone: "ranking", defaultTitle: "产品利润排行榜", defaultPosition: 20 },
  { key: "ranking.employee_efficiency", zone: "ranking", defaultTitle: "员工效率排行榜", defaultPosition: 30 },
] satisfies DashboardWidgetDefinition[];
