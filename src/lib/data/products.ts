import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoProductCosts, demoProducts, demoRecipes } from "@/lib/demo-data";
import type { Product, ProductAlias, ProductCost, Recipe } from "@/lib/types";

export async function listProducts() {
  if (!hasSupabaseEnv()) return demoProducts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("category")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as Product[];
}

export async function listProductCosts() {
  if (!hasSupabaseEnv()) return demoProductCosts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_product_theoretical_costs")
    .select("*")
    .order("category")
    .order("name");

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductCost[];
}

export async function listProductAliases() {
  if (!hasSupabaseEnv()) return [] satisfies ProductAlias[];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_aliases")
    .select("*, products(name, category, sale_price)")
    .order("alias_name");

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductAlias[];
}

export async function getProduct(productId: string) {
  if (!hasSupabaseEnv()) return demoProducts.find((product) => product.id === productId) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").eq("id", productId).single();

  if (error) throw new Error(error.message);
  return data as Product;
}

export async function listRecipe(productId: string) {
  if (!hasSupabaseEnv()) return demoRecipes.filter((recipe) => recipe.product_id === productId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, inventory_items(name, unit, category)")
    .eq("product_id", productId)
    .order("created_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as Recipe[];
}
