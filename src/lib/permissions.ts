import type { Profile, UserRole } from "@/lib/types";

export const permissionModules = [
  "平台",
  "驾驶舱",
  "库存",
  "采购",
  "产品",
  "销售",
  "损耗",
  "盘点",
  "财务",
  "员工",
  "排班",
  "绩效",
  "提成",
  "报表",
  "导入",
  "质量",
  "备份",
  "设置",
  "权限",
] as const;

export type PermissionModule = (typeof permissionModules)[number];

export const permissionCatalog = [
  { key: "platform.manage", name: "平台管理后台", module: "平台", description: "系统拥有者跨租户管理租户、门店和模块开通" },
  { key: "dashboard.view", name: "查看仪表盘", module: "驾驶舱", description: "查看经营首页和基础指标" },
  { key: "inventory.view", name: "查看库存", module: "库存", description: "查看库存余额、库存预警和库存流水" },
  { key: "inventory.manage", name: "管理库存", module: "库存", description: "新增和维护库存原料资料" },
  { key: "purchase.view", name: "查看采购", module: "采购", description: "查看采购单和采购明细" },
  { key: "purchase.create", name: "录入采购", module: "采购", description: "创建采购单并生成库存流水" },
  { key: "purchase.void", name: "作废采购", module: "采购", description: "作废已完成采购并回滚库存和现金支出" },
  { key: "product.view", name: "查看产品配方", module: "产品", description: "查看产品、别名和配方" },
  { key: "product.manage", name: "管理产品配方", module: "产品", description: "新增产品、维护配方和商品别名" },
  { key: "sales.view", name: "查看销售", module: "销售", description: "查看销售订单和销售明细" },
  { key: "sales.create", name: "录入销售", module: "销售", description: "手工创建销售订单并扣减库存" },
  { key: "sales.void", name: "作废销售", module: "销售", description: "作废销售订单并回滚库存和现金收入" },
  { key: "waste.view", name: "查看损耗", module: "损耗", description: "查看损耗记录" },
  { key: "waste.create", name: "录入损耗", module: "损耗", description: "创建损耗记录并扣减库存" },
  { key: "stock_count.view", name: "查看盘点", module: "盘点", description: "查看盘点单和盘点差异" },
  { key: "stock_count.create", name: "录入盘点", module: "盘点", description: "创建盘点并生成调整流水" },
  { key: "finance.view", name: "查看财务", module: "财务", description: "查看利润、成本、现金流和费用" },
  { key: "finance.manage", name: "管理财务", module: "财务", description: "录入费用、月结和财务调整" },
  { key: "employee.view", name: "查看员工", module: "员工", description: "查看员工资料" },
  { key: "employee.manage", name: "管理员工", module: "员工", description: "新增和维护员工资料" },
  { key: "shift.view", name: "查看排班", module: "排班", description: "查看排班表" },
  { key: "shift.manage", name: "管理排班", module: "排班", description: "创建和调整排班" },
  { key: "performance.view", name: "查看绩效", module: "绩效", description: "查看员工绩效和效率排行" },
  { key: "commission.manage", name: "管理提成", module: "提成", description: "配置提成规则和生成分配" },
  { key: "report.view", name: "查看报表", module: "报表", description: "查看库存、损耗、产品和员工报表" },
  { key: "import.manage", name: "管理导入", module: "导入", description: "导入订单、商品、库存、采购和配方" },
  { key: "quality.view", name: "查看数据质量", module: "质量", description: "查看导入质量、缺失配方和异常数据" },
  { key: "backup.manage", name: "管理备份", module: "备份", description: "生成备份清单和数据导出" },
  { key: "settings.manage", name: "系统设置", module: "设置", description: "管理门店、租户和系统配置" },
  { key: "theme.manage", name: "管理界面样式", module: "设置", description: "管理 UI 主题、按钮、图标和组件样式" },
  { key: "permission.manage", name: "管理权限", module: "权限", description: "查看和配置角色权限" },
] as const;

export type PermissionKey = (typeof permissionCatalog)[number]["key"];

export const ownerPermissions = permissionCatalog.map((permission) => permission.key) as PermissionKey[];

export const staffPermissions = [
  "dashboard.view",
  "inventory.view",
  "purchase.view",
  "purchase.create",
  "product.view",
  "sales.view",
  "sales.create",
  "waste.view",
  "waste.create",
  "stock_count.view",
  "stock_count.create",
  "shift.view",
  "report.view",
] satisfies PermissionKey[];

export const defaultRolePermissions: Record<UserRole, PermissionKey[]> = {
  owner: ownerPermissions,
  staff: staffPermissions,
};

export function getDefaultPermissions(role: UserRole) {
  return defaultRolePermissions[role];
}

export function hasPermission(profile: Pick<Profile, "role" | "permissions"> | null, permission: PermissionKey) {
  if (!profile) return false;
  const permissions = profile.permissions?.length ? profile.permissions : getDefaultPermissions(profile.role);
  return permissions.includes(permission);
}

export function hasAnyPermission(profile: Pick<Profile, "role" | "permissions"> | null, permissions: PermissionKey[]) {
  return permissions.some((permission) => hasPermission(profile, permission));
}

export function groupPermissionsByModule() {
  return permissionModules
    .map((module) => ({
      module,
      permissions: permissionCatalog.filter((permission) => permission.module === module),
    }))
    .filter((group) => group.permissions.length > 0);
}
