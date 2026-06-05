"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePaths } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const purchaseSchema = z.object({
  supplier: z.string().trim().min(1),
  purchase_date: z.string().min(1),
  payment_method: z.enum(["微信", "支付宝", "银行卡", "现金"]),
});

export async function createPurchaseOrderAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "purchase.create");
  const payload = purchaseSchema.parse(Object.fromEntries(formData));
  const lines = Array.from(formData.entries())
    .filter(([key, value]) => key.startsWith("qty:") && String(value).trim() !== "")
    .map(([key, value]) => {
      const itemId = z.string().uuid().parse(key.replace("qty:", ""));
      const unitPrice = z.coerce.number().min(0).parse(formData.get(`unit_price:${itemId}`));
      return {
        item_id: itemId,
        qty: z.coerce.number().positive().parse(value),
        unit_price: unitPrice,
      };
    });

  if (lines.length === 0) {
    throw new Error("请至少录入一个采购明细");
  }

  if (!hasSupabaseEnv()) {
    revalidatePath("/purchases");
    revalidatePath("/inventory/movements");
    revalidatePath("/inventory/items");
    redirect("/purchases");
  }

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("purchase_orders")
    .insert({
      store_id: profile.store_id,
      supplier: payload.supplier,
      purchase_date: payload.purchase_date,
      payment_method: payload.payment_method,
      operator_id: profile.id,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "创建采购单失败");
  }

  const { error: itemError } = await supabase.from("purchase_order_items").insert(
    lines.map((line) => ({
      store_id: profile.store_id,
      purchase_order_id: order.id,
      ...line,
    })),
  );

  if (itemError) {
    throw new Error(itemError.message);
  }

  const { error: rpcError } = await supabase.rpc("complete_purchase_order", {
    p_purchase_order_id: order.id,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  revalidatePath("/purchases");
  revalidatePath("/inventory/movements");
  revalidatePath("/inventory/items");
  redirect("/purchases");
}

export async function voidPurchaseOrderAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "purchase.void");
  const purchaseOrderId = z.string().uuid().parse(formData.get("purchase_order_id"));

  if (!hasSupabaseEnv()) {
    return await revalidatePaths(["/purchases", "/inventory/items", "/inventory/movements"]);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_purchase_order", {
    p_purchase_order_id: purchaseOrderId,
  });

  if (error) throw new Error(error.message);

  return await revalidatePaths(["/purchases", "/inventory/items", "/inventory/movements"]);
}
