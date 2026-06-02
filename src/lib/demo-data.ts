import type {
  CashflowSummary,
  CommissionRule,
  CostSummary,
  Employee,
  EmployeePerformance,
  ExpenseRecord,
  InventoryBalance,
  InventoryItem,
  InventoryMovement,
  MonthCloseSnapshot,
  Product,
  ProductAlias,
  ProductCost,
  ProfitLoss,
  PurchaseOrder,
  PurchaseOrderItem,
  Recipe,
  SalesOrder,
  SalesOrderItem,
  Shift,
  StockCount,
  StockCountItem,
  WasteRecord,
} from "@/lib/types";
import type { ProductSalesReport, WasteSummary } from "@/lib/data/reports";

const storeId = "00000000-0000-0000-0000-000000000001";

export const demoInventoryItems: InventoryItem[] = [];
export const demoInventoryBalances: InventoryBalance[] = [];
export const demoPurchaseOrders: PurchaseOrder[] = [];
export const demoPurchaseOrderItems: PurchaseOrderItem[] = [];
export const demoInventoryMovements: InventoryMovement[] = [];
export const demoProducts: Product[] = [];
export const demoProductAliases: ProductAlias[] = [];
export const demoProductCosts: ProductCost[] = [];
export const demoRecipes: Recipe[] = [];
export const demoSalesOrders: SalesOrder[] = [];
export const demoSalesOrderItems: SalesOrderItem[] = [];
export const demoWasteRecords: WasteRecord[] = [];
export const demoStockCounts: StockCount[] = [];
export const demoStockCountItems: StockCountItem[] = [];
export const demoExpenseRecords: ExpenseRecord[] = [];
export const demoCostSummary: CostSummary[] = [];
export const demoProfitLoss: ProfitLoss[] = [];
export const demoMonthCloseSnapshots: MonthCloseSnapshot[] = [];
export const demoEmployees: Employee[] = [];
export const demoShifts: Shift[] = [];
export const demoEmployeePerformance: EmployeePerformance[] = [];
export const demoCommissionRules: CommissionRule[] = [];
export const demoWasteSummary: WasteSummary[] = [];
export const demoProductSalesReport: ProductSalesReport[] = [];

export const demoCashflowSummary: CashflowSummary = {
  store_id: storeId,
  total_income: 0,
  total_expense: 0,
  cash_balance: 0,
};
