"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePaths } from "@/lib/actions/refresh";
import { CATEGORY_UNITS } from "@/lib/constants";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { InventoryCategory, InventoryUnit } from "@/lib/types";

const inventoryItemSchema = z.object({
  name: z.string().trim().min(1, "请输入原料名称"),
  category: z.enum(["咖啡豆", "奶类", "糖浆", "酒类", "耗材", "食品"]),
  unit: z.enum(["g", "ml", "pcs"]),
  specification: z.string().trim().optional(),
  safe_stock: z.coerce.number().min(0),
  cost_price: z.coerce.number().min(0),
});

const inventoryItemStatusSchema = z.object({
  item_id: z.string().uuid(),
  status: z.enum(["active", "inactive", "disabled"]),
});

const inventoryItemUpdateSchema = inventoryItemSchema.extend({
  item_id: z.string().uuid(),
});

function assertAllowedUnit(category: InventoryCategory, unit: InventoryUnit) {
  const allowedUnits = CATEGORY_UNITS[category];
  if (!allowedUnits.includes(unit)) {
    throw new Error("该分类不允许使用当前单位");
  }
}

export async function createInventoryItemAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "inventory.manage");

  const payload = inventoryItemSchema.parse(Object.fromEntries(formData));
  assertAllowedUnit(payload.category as InventoryCategory, payload.unit as InventoryUnit);

  if (!hasSupabaseEnv()) {
    revalidatePath("/inventory/items");
    redirect("/inventory/items");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_items").insert({
    store_id: profile.store_id,
    ...payload,
    specification: payload.specification || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/inventory/items");
  redirect("/inventory/items");
}

export async function updateInventoryItemAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "inventory.manage");
  const payload = inventoryItemUpdateSchema.parse(Object.fromEntries(formData));
  assertAllowedUnit(payload.category as InventoryCategory, payload.unit as InventoryUnit);

  if (!hasSupabaseEnv()) {
    revalidatePath("/inventory/items");
    redirect("/inventory/items");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({
      name: payload.name,
      category: payload.category,
      unit: payload.unit,
      specification: payload.specification || null,
      safe_stock: payload.safe_stock,
      cost_price: payload.cost_price,
    })
    .eq("id", payload.item_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);

  revalidatePath("/inventory/items");
  redirect("/inventory/items");
}

export async function updateInventoryItemStatusAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "inventory.manage");
  const payload = inventoryItemStatusSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/inventory/items", "/inventory/alerts", "/inventory/replenishment"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ status: payload.status })
    .eq("id", payload.item_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/inventory/items", "/inventory/alerts", "/inventory/replenishment"]);
}
