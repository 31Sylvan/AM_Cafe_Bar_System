"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATEGORY_UNITS } from "@/lib/constants";
import { requireProfile, requireOwner } from "@/lib/auth";
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

export async function createInventoryItemAction(formData: FormData) {
  const profile = await requireProfile();
  requireOwner(profile);

  const payload = inventoryItemSchema.parse(Object.fromEntries(formData));
  const allowedUnits = CATEGORY_UNITS[payload.category as InventoryCategory];

  if (!allowedUnits.includes(payload.unit as InventoryUnit)) {
    throw new Error("该分类不允许使用当前单位");
  }

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
