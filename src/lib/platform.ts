export const platformModules = [
  { key: "inventory", name: "库存中心", description: "库存原料、库存流水、库存预警和补货建议" },
  { key: "purchase", name: "采购管理", description: "采购单、库存入库和采购现金支出" },
  { key: "product", name: "产品配方", description: "产品、配方、商品别名和理论成本" },
  { key: "sales", name: "销售管理", description: "手工销售、订单导入和库存扣减" },
  { key: "finance", name: "财务中心", description: "成本、利润表、现金流、费用和月结" },
  { key: "staff", name: "员工系统", description: "员工、排班、绩效和提成" },
  { key: "reports", name: "报表中心", description: "库存、损耗、产品和员工报表" },
  { key: "imports", name: "真实数据导入", description: "商品、订单、库存、采购和配方导入" },
  { key: "theme", name: "UI 样式管理", description: "门店后台主题、按钮、图标和组件样式" },
  { key: "permissions", name: "权限系统", description: "角色权限和成员级权限覆盖" },
] as const;

export type PlatformModuleKey = (typeof platformModules)[number]["key"];
