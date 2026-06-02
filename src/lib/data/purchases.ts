import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoPurchaseOrderItems, demoPurchaseOrders } from "@/lib/demo-data";
import { inDateRange, type StatusFilter } from "@/lib/filters";
import type { PurchaseOrder, PurchaseOrderDetail, PurchaseStatus } from "@/lib/types";

export async function listPurchaseOrders(filter: StatusFilter<PurchaseStatus> = {}) {
  if (!hasSupabaseEnv()) {
    return demoPurchaseOrders.filter((order) => {
      const statusMatched = !filter.status || filter.status === "all" || order.status === filter.status;
      return statusMatched && inDateRange(order.purchase_date, filter);
    });
  }

  const supabase = await createClient();
  let query = supabase
    .from("purchase_orders")
    .select("*")
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter.from) query = query.gte("purchase_date", filter.from);
  if (filter.to) query = query.lte("purchase_date", filter.to);
  if (filter.status && filter.status !== "all") query = query.eq("status", filter.status);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PurchaseOrder[];
}

export async function getPurchaseOrder(purchaseOrderId: string) {
  if (!hasSupabaseEnv()) {
    const order = demoPurchaseOrders.find((item) => item.id === purchaseOrderId);
    if (!order) return null;
    return {
      ...order,
      purchase_order_items: demoPurchaseOrderItems.filter((item) => item.purchase_order_id === purchaseOrderId),
    } satisfies PurchaseOrderDetail;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*, purchase_order_items(*, inventory_items(name, unit, category))")
    .eq("id", purchaseOrderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PurchaseOrderDetail | null;
}
