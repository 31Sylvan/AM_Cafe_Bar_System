export type UserRole = "owner" | "staff";
export type RecordStatus = "active" | "inactive" | "disabled";
export type InventoryCategory = "咖啡豆" | "奶类" | "糖浆" | "酒类" | "耗材" | "食品";
export type InventoryUnit = "g" | "ml" | "pcs";
export type PurchaseStatus = "draft" | "completed" | "void";
export type SalesOrderStatus = "completed" | "void";
export type InventoryMovementType =
  | "PURCHASE"
  | "SALE"
  | "WASTE"
  | "COUNT_ADJUST"
  | "TRANSFER"
  | "MANUAL_ADJUST";

export type Profile = {
  id: string;
  tenant_id: string;
  store_id: string;
  role: UserRole;
  display_name: string;
  phone: string | null;
  status: RecordStatus;
  permissions?: string[];
  is_platform_admin?: boolean;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: RecordStatus;
  created_at: string;
};

export type StoreModuleEntitlement = {
  store_id: string;
  module_key: string;
  enabled: boolean;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type PlatformStoreOverview = Store & {
  tenants?: Pick<Tenant, "id" | "name" | "slug" | "status"> | null;
  store_memberships?: Array<Pick<StoreMembership, "id" | "role" | "status" | "profile_id">>;
  store_module_entitlements?: StoreModuleEntitlement[];
};

export type InventoryItem = {
  id: string;
  store_id: string;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  specification: string | null;
  safe_stock: number;
  cost_price: number;
  status: RecordStatus;
  created_at: string;
};

export type Store = {
  id: string;
  tenant_id: string;
  name: string;
  business_mode: string;
  address: string | null;
  timezone: string;
  status: RecordStatus;
  ui_theme?: Record<string, unknown> | null;
  created_at: string;
};

export type StoreMembership = {
  id: string;
  tenant_id: string;
  store_id: string;
  profile_id: string;
  role: UserRole;
  status: RecordStatus;
  created_at: string;
  stores?: Store | null;
  profiles?: Pick<Profile, "id" | "display_name" | "phone" | "role" | "status"> | null;
};

export type MemberPermissionOverride = {
  tenant_id: string;
  store_id: string;
  profile_id: string;
  permission_key: string;
  effect: "allow" | "deny";
  updated_at: string;
  profiles?: Pick<Profile, "id" | "display_name" | "phone" | "role" | "status"> | null;
  stores?: Pick<Store, "id" | "name"> | null;
};

export type ImportBatch = {
  id: string;
  tenant_id: string;
  store_id: string;
  import_type: "products" | "inventory" | "purchases" | "recipes" | "orders";
  source_file: string;
  status: "completed" | "failed";
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  warning_count: number;
  error_message: string | null;
  created_by: string;
  created_at: string;
};

export type ImportBatchIssue = {
  id: string;
  tenant_id: string;
  store_id: string;
  import_batch_id: string;
  severity: "info" | "warning" | "error";
  issue_type: string;
  entity_name: string;
  message: string;
  row_no: number | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type InventoryBalance = {
  store_id: string;
  item_id: string;
  name: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  specification: string | null;
  safe_stock: number;
  cost_price: number;
  status: RecordStatus;
  current_qty: number;
  inventory_value: number;
  is_low_stock: boolean;
};

export type ReplenishmentSuggestion = InventoryBalance & {
  avg_daily_usage: number;
  days_until_stockout: number | null;
  suggested_order_qty: number;
  suggested_budget: number;
  priority: "urgent" | "soon" | "normal";
};

export type PurchaseOrder = {
  id: string;
  store_id: string;
  supplier: string;
  purchase_date: string;
  total_amount: number;
  payment_method: PaymentMethod;
  operator_id: string;
  status: PurchaseStatus;
  created_at: string;
};

export type PurchaseOrderItem = {
  id: string;
  store_id: string;
  purchase_order_id: string;
  item_id: string;
  qty: number;
  unit_price: number;
  amount: number;
  created_at: string;
  inventory_items?: Pick<InventoryItem, "name" | "unit" | "category"> | null;
};

export type PurchaseOrderDetail = PurchaseOrder & {
  purchase_order_items: PurchaseOrderItem[];
};

export type InventoryMovement = {
  id: string;
  store_id: string;
  item_id: string;
  movement_type: InventoryMovementType;
  qty: number;
  before_qty: number;
  after_qty: number;
  reference_type: string;
  reference_id: string;
  operator_id: string;
  created_at: string;
  inventory_items?: Pick<InventoryItem, "name" | "unit" | "category"> | null;
};

export type ProductCategory = "咖啡" | "茶饮" | "鸡尾酒" | "啤酒" | "食品";
export type SalesChannel = "堂食" | "小程序" | "美团" | "饿了么";
export type PaymentMethod = "微信" | "支付宝" | "银行卡" | "现金";
export type WasteReason = "过期" | "打翻" | "制作失败" | "赠饮" | "员工饮用" | "其他";
export type StockCountType = "daily" | "weekly" | "monthly";
export type StockCountStatus = "draft" | "completed";
export type ExpenseCategory = "采购" | "工资" | "房租" | "水电" | "营销" | "其他";
export type CashDirection = "income" | "expense";

export type Product = {
  id: string;
  store_id: string;
  name: string;
  category: ProductCategory;
  sale_price: number;
  status: RecordStatus;
  created_at: string;
};

export type ProductAlias = {
  id: string;
  store_id: string;
  alias_name: string;
  product_id: string;
  source: string | null;
  created_by: string;
  created_at: string;
  products?: Pick<Product, "name" | "category" | "sale_price"> | null;
};

export type ProductCost = {
  store_id: string;
  product_id: string;
  name: string;
  category: ProductCategory;
  sale_price: number;
  status: RecordStatus;
  theoretical_cost: number;
  theoretical_gross_profit: number;
  theoretical_gross_margin: number;
};

export type Recipe = {
  id: string;
  store_id: string;
  product_id: string;
  item_id: string;
  qty: number;
  unit: InventoryUnit;
  created_at: string;
  inventory_items?: Pick<InventoryItem, "name" | "unit" | "category"> | null;
};

export type SalesOrder = {
  id: string;
  store_id: string;
  sale_date: string;
  channel: SalesChannel;
  payment_method: PaymentMethod;
  total_amount: number;
  operator_id: string;
  status: SalesOrderStatus;
  created_at: string;
};

export type SalesOrderItem = {
  id: string;
  store_id: string;
  sales_order_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  amount: number;
  theoretical_cost: number;
  created_at: string;
  products?: Pick<Product, "name" | "category"> | null;
};

export type SalesOrderDetail = SalesOrder & {
  sales_order_items: SalesOrderItem[];
};

export type WasteRecord = {
  id: string;
  store_id: string;
  item_id: string;
  qty: number;
  reason: WasteReason;
  photo_url: string | null;
  operator_id: string;
  created_at: string;
  voided?: boolean;
  inventory_items?: Pick<InventoryItem, "name" | "unit" | "category" | "cost_price"> | null;
};

export type StockCount = {
  id: string;
  store_id: string;
  count_type: StockCountType;
  count_date: string;
  operator_id: string;
  status: StockCountStatus;
  created_at: string;
  voided?: boolean;
};

export type StockCountItem = {
  id: string;
  store_id: string;
  stock_count_id: string;
  item_id: string;
  theoretical_qty: number;
  actual_qty: number;
  difference_qty: number;
  created_at: string;
  inventory_items?: Pick<InventoryItem, "name" | "unit" | "category"> | null;
};

export type StockCountDetail = StockCount & {
  stock_count_items: StockCountItem[];
};

export type ExpenseRecord = {
  id: string;
  store_id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  payment_method: PaymentMethod;
  note: string | null;
  created_by: string;
  created_at: string;
};

export type CostSummary = {
  store_id: string;
  month: string;
  theoretical_cost: number;
  actual_cost: number;
  cost_variance: number;
};

export type ProfitLoss = {
  store_id: string;
  month: string;
  revenue: number;
  material_cost: number;
  gross_profit: number;
  gross_margin: number;
  labor_cost: number;
  rent_cost: number;
  utility_cost: number;
  marketing_cost: number;
  other_cost: number;
  net_profit: number;
};

export type CashflowSummary = {
  store_id: string;
  total_income: number;
  total_expense: number;
  cash_balance: number;
};

export type MonthCloseSnapshot = {
  id: string;
  store_id: string;
  month: string;
  revenue: number;
  material_cost: number;
  gross_profit: number;
  gross_margin: number;
  labor_cost: number;
  rent_cost: number;
  utility_cost: number;
  marketing_cost: number;
  other_cost: number;
  net_profit: number;
  theoretical_cost: number;
  actual_cost: number;
  cost_variance: number;
  cash_balance: number;
  status: "closed";
  closed_by: string;
  closed_at: string;
};

export type Employee = {
  id: string;
  store_id: string;
  profile_id: string | null;
  name: string;
  phone: string | null;
  position: string;
  hourly_rate: number;
  hire_date: string;
  status: "active" | "inactive";
  created_at: string;
};

export type EmployeeAccountInvite = {
  id: string;
  tenant_id: string;
  store_id: string;
  employee_id: string;
  email: string;
  role: UserRole;
  status: "pending" | "created" | "expired" | "canceled";
  auth_user_id: string | null;
  invited_by: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type Shift = {
  id: string;
  store_id: string;
  employee_id: string;
  start_time: string;
  end_time: string;
  role: string;
  status: "scheduled" | "completed" | "canceled";
  created_at: string;
  employees?: Pick<Employee, "name" | "position"> | null;
};

export type EmployeePerformance = {
  store_id: string;
  employee_id: string;
  name: string;
  total_hours: number;
  shift_count: number;
  shift_revenue: number;
  revenue_per_hour: number;
  late_count: number;
  leave_count: number;
};

export type CommissionRule = {
  id: string;
  store_id: string;
  month: string;
  revenue_target: number;
  bonus_pool_rate: number;
  status: "active" | "inactive";
  created_at: string;
};
