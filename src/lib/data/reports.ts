import { createClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { demoProductSalesReport, demoWasteSummary } from "@/lib/demo-data";

export type WasteSummary = {
  store_id: string;
  item_id: string;
  name: string;
  category: string;
  unit: string;
  waste_qty: number;
  waste_amount: number;
  waste_count: number;
};

export type ProductSalesReport = {
  store_id: string;
  product_id: string;
  name: string;
  category: string;
  sales_qty: number;
  sales_amount: number;
  theoretical_cost: number;
  gross_profit: number;
  gross_margin: number;
};

export async function listWasteSummary() {
  if (!hasSupabaseEnv()) return demoWasteSummary;

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_waste_summary").select("*").order("waste_amount", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as WasteSummary[];
}

export async function listProductSalesReport() {
  if (!hasSupabaseEnv()) return demoProductSalesReport;

  const supabase = await createClient();
  const { data, error } = await supabase.from("v_product_sales_report").select("*").order("gross_profit", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductSalesReport[];
}
