import type { InventoryCategory, InventoryUnit } from "@/lib/types";

export const INVENTORY_CATEGORIES: InventoryCategory[] = [
  "咖啡豆",
  "奶类",
  "糖浆",
  "酒类",
  "耗材",
  "食品",
];

export const CATEGORY_UNITS: Record<InventoryCategory, InventoryUnit[]> = {
  咖啡豆: ["g"],
  奶类: ["ml"],
  糖浆: ["ml"],
  酒类: ["ml"],
  耗材: ["pcs"],
  食品: ["g", "pcs"],
};

export const MOVEMENT_LABELS = {
  PURCHASE: "采购入库",
  SALE: "销售扣减",
  WASTE: "损耗",
  COUNT_ADJUST: "盘点调整",
  TRANSFER: "门店调拨",
  MANUAL_ADJUST: "手工调整",
} as const;

export const PRODUCT_CATEGORIES = ["咖啡", "茶饮", "鸡尾酒", "啤酒", "食品"] as const;
export const SALES_CHANNELS = ["堂食", "小程序", "美团", "饿了么"] as const;
export const PAYMENT_METHODS = ["微信", "支付宝", "银行卡", "现金"] as const;
export const WASTE_REASONS = ["过期", "打翻", "制作失败", "赠饮", "员工饮用", "其他"] as const;
export const STOCK_COUNT_TYPES = [
  { value: "daily", label: "每日盘点" },
  { value: "weekly", label: "周盘点" },
  { value: "monthly", label: "月盘点" },
] as const;
export const EXPENSE_CATEGORIES = ["采购", "工资", "房租", "水电", "营销", "其他"] as const;
