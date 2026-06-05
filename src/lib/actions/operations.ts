"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidateAndReturn } from "@/lib/actions/refresh";
import { requirePermission, requireProfile } from "@/lib/auth";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";

const saleSchema = z.object({
  sale_date: z.string().min(1),
  channel: z.enum(["堂食", "小程序", "美团", "饿了么"]),
  payment_method: z.enum(["微信", "支付宝", "银行卡", "现金"]),
});

const wasteSchema = z.object({
  item_id: z.string().uuid(),
  qty: z.coerce.number().positive(),
  reason: z.enum(["过期", "打翻", "制作失败", "赠饮", "员工饮用", "其他"]),
});

const stockCountSchema = z.object({
  count_type: z.enum(["daily", "weekly", "monthly"]),
  count_date: z.string().min(1),
});

export async function createSaleOrderAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "sales.create");
  const payload = saleSchema.parse(Object.fromEntries(formData));
  const lines = Array.from(formData.entries())
    .filter(([key, value]) => key.startsWith("qty:") && String(value).trim() !== "")
    .map(([key, value]) => {
      const productId = z.string().uuid().parse(key.replace("qty:", ""));
      return {
        product_id: productId,
        qty: z.coerce.number().positive().parse(value),
        unit_price: z.coerce.number().min(0).parse(formData.get(`unit_price:${productId}`)),
      };
    });

  if (lines.length === 0) {
    throw new Error("请至少录入一个销售明细");
  }

  if (!hasSupabaseEnv()) {
    revalidatePath("/sales");
    revalidatePath("/inventory/items");
    revalidatePath("/inventory/movements");
    redirect("/sales");
  }

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("sales_orders")
    .insert({
      store_id: profile.store_id,
      sale_date: payload.sale_date,
      channel: payload.channel,
      payment_method: payload.payment_method,
      operator_id: profile.id,
    })
    .select("id")
    .single();

  if (orderError || !order) throw new Error(orderError?.message ?? "创建销售单失败");

  const { error: itemError } = await supabase.from("sales_order_items").insert(
    lines.map((line) => ({
      store_id: profile.store_id,
      sales_order_id: order.id,
      ...line,
    })),
  );

  if (itemError) throw new Error(itemError.message);

  const { error: rpcError } = await supabase.rpc("complete_sale_order", {
    p_sales_order_id: order.id,
  });

  if (rpcError) throw new Error(rpcError.message);

  revalidatePath("/sales");
  revalidatePath("/inventory/items");
  revalidatePath("/inventory/movements");
  redirect("/sales");
}

export async function voidSaleOrderAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "sales.void");
  const salesOrderId = z.string().uuid().parse(formData.get("sales_order_id"));

  if (!hasSupabaseEnv()) {
    await revalidateAndReturn(["/sales", "/inventory/items", "/inventory/movements", "/finance/cashflow"], "/sales");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_sales_order", {
    p_sales_order_id: salesOrderId,
  });

  if (error) throw new Error(error.message);

  await revalidateAndReturn(["/sales", "/inventory/items", "/inventory/movements", "/finance/cashflow"], "/sales");
}

export async function createWasteRecordAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "waste.create");
  const payload = wasteSchema.parse(Object.fromEntries(formData));

  if (!hasSupabaseEnv()) {
    revalidatePath("/waste");
    revalidatePath("/inventory/items");
    revalidatePath("/inventory/movements");
    redirect("/waste");
  }

  const supabase = await createClient();
  const photo = formData.get("photo");
  let photoUrl: string | null = null;

  if (photo instanceof File && photo.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) {
      throw new Error("损耗照片仅支持 JPG、PNG 或 WebP");
    }

    if (photo.size > 5 * 1024 * 1024) {
      throw new Error("损耗照片不能超过 5MB");
    }

    const extension = photo.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.store_id}/waste/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("waste-photos").upload(path, photo, {
      contentType: photo.type,
      upsert: false,
    });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from("waste-photos").getPublicUrl(path);
    photoUrl = data.publicUrl;
  }

  const { error } = await supabase.rpc("create_waste_record", {
    p_item_id: payload.item_id,
    p_qty: payload.qty,
    p_reason: payload.reason,
    p_photo_url: photoUrl,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/waste");
  revalidatePath("/inventory/items");
  revalidatePath("/inventory/movements");
  redirect("/waste");
}

export async function createStockCountAction(formData: FormData) {
  const profile = await requireProfile();
  requirePermission(profile, "stock_count.create");
  const payload = stockCountSchema.parse(Object.fromEntries(formData));
  const actualEntries = Array.from(formData.entries())
    .filter(([key, value]) => key.startsWith("actual_qty:") && String(value).trim() !== "")
    .map(([key, value]) => ({
      item_id: z.string().uuid().parse(key.replace("actual_qty:", "")),
      actual_qty: z.coerce.number().min(0).parse(value),
    }));

  if (actualEntries.length === 0) {
    throw new Error("请至少录入一个原料的实际库存");
  }

  if (!hasSupabaseEnv()) {
    revalidatePath("/stock-counts");
    revalidatePath("/inventory/items");
    revalidatePath("/inventory/movements");
    redirect("/stock-counts");
  }

  const supabase = await createClient();
  const { data: balances, error: balanceError } = await supabase
    .from("v_inventory_balances")
    .select("item_id, current_qty")
    .in(
      "item_id",
      actualEntries.map((entry) => entry.item_id),
    );

  if (balanceError) throw new Error(balanceError.message);

  const theoreticalByItem = new Map((balances ?? []).map((item) => [item.item_id, Number(item.current_qty)]));

  const { data: count, error: countError } = await supabase
    .from("stock_counts")
    .insert({
      store_id: profile.store_id,
      count_type: payload.count_type,
      count_date: payload.count_date,
      operator_id: profile.id,
    })
    .select("id")
    .single();

  if (countError || !count) throw new Error(countError?.message ?? "创建盘点单失败");

  const { error: itemError } = await supabase.from("stock_count_items").insert(
    actualEntries.map((entry) => ({
      store_id: profile.store_id,
      stock_count_id: count.id,
      item_id: entry.item_id,
      theoretical_qty: theoreticalByItem.get(entry.item_id) ?? 0,
      actual_qty: entry.actual_qty,
    })),
  );

  if (itemError) throw new Error(itemError.message);

  const { error: rpcError } = await supabase.rpc("complete_stock_count", {
    p_stock_count_id: count.id,
  });

  if (rpcError) throw new Error(rpcError.message);

  revalidatePath("/stock-counts");
  revalidatePath("/inventory/items");
  revalidatePath("/inventory/movements");
  redirect("/stock-counts");
}
