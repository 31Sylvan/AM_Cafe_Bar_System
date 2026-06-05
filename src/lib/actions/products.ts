"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePaths } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const productSchema = z.object({
  name: z.string().trim().min(1),
  category: z.enum(["咖啡", "茶饮", "鸡尾酒", "啤酒", "食品"]),
  sale_price: z.coerce.number().min(0),
});

const productUpdateSchema = productSchema.extend({
  product_id: z.string().uuid(),
});

const productStatusSchema = z.object({
  product_id: z.string().uuid(),
  status: z.enum(["active", "inactive", "disabled"]),
});

const recipeSchema = z.object({
  product_id: z.string().uuid(),
  item_id: z.string().uuid(),
  qty: z.coerce.number().positive(),
  unit: z.enum(["g", "ml", "pcs"]),
});

const recipeDeleteSchema = z.object({
  recipe_id: z.string().uuid(),
  product_id: z.string().uuid(),
});

const productAliasSchema = z.object({
  alias_name: z.string().trim().min(1),
  product_id: z.string().uuid(),
  source: z.string().trim().optional(),
});

export async function createProductAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");

  const payload = productSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/products");
    redirect("/products");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    store_id: profile.store_id,
    ...payload,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProductAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");
  const payload = productUpdateSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/products");
    redirect("/products");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: payload.name,
      category: payload.category,
      sale_price: payload.sale_price,
    })
    .eq("id", payload.product_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProductStatusAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");
  const payload = productStatusSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/products", `/products/${payload.product_id}`, "/products/aliases"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ status: payload.status })
    .eq("id", payload.product_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/products", `/products/${payload.product_id}`, "/products/aliases"]);
}

export async function addRecipeItemAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");

  const payload = recipeSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/products", `/products/${payload.product_id}`]);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("recipes").insert({
    store_id: profile.store_id,
    ...payload,
  });

  if (error) throw new Error(error.message);

  return await revalidatePaths(["/products", `/products/${payload.product_id}`]);
}

export async function deleteRecipeItemAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");
  const payload = recipeDeleteSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/products", `/products/${payload.product_id}`]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", payload.recipe_id)
    .eq("product_id", payload.product_id)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);
  return await revalidatePaths(["/products", `/products/${payload.product_id}`]);
}

export async function createProductAliasAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");

  const payload = productAliasSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/products/aliases"]);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("product_aliases").insert({
    store_id: profile.store_id,
    alias_name: payload.alias_name,
    product_id: payload.product_id,
    source: payload.source || null,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);

  return await revalidatePaths(["/products/aliases", "/imports/orders"]);
}

export async function deleteProductAliasAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "product.manage");

  const aliasId = z.string().uuid().parse(formData.get("alias_id"));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/products/aliases"]);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_aliases")
    .delete()
    .eq("id", aliasId)
    .eq("store_id", profile.store_id);

  if (error) throw new Error(error.message);

  return await revalidatePaths(["/products/aliases", "/imports/orders"]);
}
