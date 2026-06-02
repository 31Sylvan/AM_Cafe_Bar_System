import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoInventoryBalances, demoProducts } from "@/lib/demo-data";
import type { InventoryBalance, Product } from "@/lib/types";

export async function listProductsWithoutRecipe() {
  if (!hasSupabaseEnv()) return [demoProducts[2]].filter(Boolean);

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_products_without_recipe").select("*").order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function listNegativeInventoryBalances() {
  if (!hasSupabaseEnv()) return demoInventoryBalances.filter((item) => item.current_qty < 0);

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_inventory_negative_balances").select("*").order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryBalance[];
}
