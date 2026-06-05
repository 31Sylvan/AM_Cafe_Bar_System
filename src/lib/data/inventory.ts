import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoInventoryBalances, demoInventoryItems, demoInventoryMovements } from "@/lib/demo-data";
import { inDateRange, type DateRangeFilter } from "@/lib/filters";
import type { InventoryBalance, InventoryItem, InventoryMovement, InventoryMovementType, ReplenishmentSuggestion } from "@/lib/types";

type ReplenishmentPriority = ReplenishmentSuggestion["priority"];

export async function listInventoryBalances() {
  if (!hasSupabaseEnv()) return demoInventoryBalances;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_inventory_balances")
    .select("*")
    .order("category")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as InventoryBalance[];
}

export async function listInventoryItems() {
  if (!hasSupabaseEnv()) return demoInventoryItems;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("status", "active")
    .order("category")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as InventoryItem[];
}

export async function getInventoryItem(itemId: string) {
  if (!hasSupabaseEnv()) return demoInventoryItems.find((item) => item.id === itemId) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as InventoryItem | null;
}

export type MovementFilter = DateRangeFilter & {
  movement_type?: InventoryMovementType | "all";
};

export async function listInventoryMovements(filter: MovementFilter = {}) {
  if (!hasSupabaseEnv()) {
    return demoInventoryMovements.filter((movement) => {
      const typeMatched = !filter.movement_type || filter.movement_type === "all" || movement.movement_type === filter.movement_type;
      return typeMatched && inDateRange(movement.created_at.slice(0, 10), filter);
    });
  }

  const supabase = await createClient();
  let query = supabase
    .from("inventory_movements")
    .select("*, inventory_items(name, unit, category)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter.from) query = query.gte("created_at", `${filter.from}T00:00:00`);
  if (filter.to) query = query.lte("created_at", `${filter.to}T23:59:59`);
  if (filter.movement_type && filter.movement_type !== "all") query = query.eq("movement_type", filter.movement_type);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as InventoryMovement[];
}

export async function listReplenishmentSuggestions(): Promise<ReplenishmentSuggestion[]> {
  const [balances, movements] = await Promise.all([
    listInventoryBalances(),
    listInventoryMovements({
      from: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    }),
  ]);

  const usageByItem = new Map<string, number>();

  for (const movement of movements) {
    if (!["SALE", "WASTE", "COUNT_ADJUST"].includes(movement.movement_type)) continue;
    if (Number(movement.qty) >= 0) continue;
    usageByItem.set(movement.item_id, (usageByItem.get(movement.item_id) ?? 0) + Math.abs(Number(movement.qty)));
  }

  return balances
    .map((item) => {
      const avgDailyUsage = Number(((usageByItem.get(item.item_id) ?? 0) / 30).toFixed(3));
      const daysUntilStockout = avgDailyUsage > 0 ? Number((Number(item.current_qty) / avgDailyUsage).toFixed(1)) : null;
      const targetQty = Math.max(Number(item.safe_stock) * 2, avgDailyUsage * 14);
      const suggestedOrderQty = Math.max(0, Number((targetQty - Number(item.current_qty)).toFixed(3)));
      const priority: ReplenishmentPriority = Number(item.current_qty) <= Number(item.safe_stock) ? "urgent" : daysUntilStockout !== null && daysUntilStockout <= 7 ? "soon" : "normal";

      return {
        ...item,
        avg_daily_usage: avgDailyUsage,
        days_until_stockout: daysUntilStockout,
        suggested_order_qty: suggestedOrderQty,
        suggested_budget: Number((suggestedOrderQty * Number(item.cost_price)).toFixed(2)),
        priority,
      };
    })
    .filter((item) => item.suggested_order_qty > 0 || item.priority !== "normal")
    .sort((a, b) => {
      const priorityWeight = { urgent: 0, soon: 1, normal: 2 };
      return priorityWeight[a.priority] - priorityWeight[b.priority] || b.suggested_budget - a.suggested_budget;
    });
}
