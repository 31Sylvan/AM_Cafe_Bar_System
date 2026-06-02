import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoSalesOrderItems, demoSalesOrders, demoStockCountItems, demoStockCounts, demoWasteRecords } from "@/lib/demo-data";
import { inDateRange, type DateRangeFilter, type StatusFilter } from "@/lib/filters";
import type { SalesOrder, SalesOrderDetail, SalesOrderStatus, StockCount, StockCountDetail, StockCountStatus, WasteRecord } from "@/lib/types";

export async function listSalesOrders(filter: StatusFilter<SalesOrderStatus> = {}) {
  if (!hasSupabaseEnv()) {
    return demoSalesOrders.filter((order) => {
      const statusMatched = !filter.status || filter.status === "all" || order.status === filter.status;
      return statusMatched && inDateRange(order.sale_date, filter);
    });
  }

  const supabase = await createClient();
  let query = supabase
    .from("sales_orders")
    .select("*")
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter.from) query = query.gte("sale_date", filter.from);
  if (filter.to) query = query.lte("sale_date", filter.to);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as SalesOrder[];
}

export async function getSalesOrder(salesOrderId: string) {
  if (!hasSupabaseEnv()) {
    const order = demoSalesOrders.find((item) => item.id === salesOrderId);
    if (!order) return null;
    return {
      ...order,
      sales_order_items: demoSalesOrderItems.filter((item) => item.sales_order_id === salesOrderId),
    } satisfies SalesOrderDetail;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_orders")
    .select("*, sales_order_items(*, products(name, category))")
    .eq("id", salesOrderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SalesOrderDetail | null;
}

export async function listWasteRecords(filter: DateRangeFilter = {}) {
  if (!hasSupabaseEnv()) {
    return demoWasteRecords.filter((record) => inDateRange(record.created_at.slice(0, 10), filter));
  }

  const supabase = await createClient();
  let query = supabase
    .from("waste_records")
    .select("*, inventory_items(name, unit, category, cost_price)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter.from) query = query.gte("created_at", `${filter.from}T00:00:00`);
  if (filter.to) query = query.lte("created_at", `${filter.to}T23:59:59`);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as WasteRecord[];
}

export async function listStockCounts(filter: StatusFilter<StockCountStatus> = {}) {
  if (!hasSupabaseEnv()) {
    return demoStockCounts.filter((count) => {
      const statusMatched = !filter.status || filter.status === "all" || count.status === filter.status;
      return statusMatched && inDateRange(count.count_date, filter);
    });
  }

  const supabase = await createClient();
  let query = supabase
    .from("stock_counts")
    .select("*")
    .order("count_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter.from) query = query.gte("count_date", filter.from);
  if (filter.to) query = query.lte("count_date", filter.to);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data ?? []) as StockCount[];
}

export async function getStockCount(stockCountId: string) {
  if (!hasSupabaseEnv()) {
    const count = demoStockCounts.find((item) => item.id === stockCountId);
    if (!count) return null;
    return {
      ...count,
      stock_count_items: demoStockCountItems.filter((item) => item.stock_count_id === stockCountId),
    } satisfies StockCountDetail;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_counts")
    .select("*, stock_count_items(*, inventory_items(name, unit, category))")
    .eq("id", stockCountId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as StockCountDetail | null;
}
