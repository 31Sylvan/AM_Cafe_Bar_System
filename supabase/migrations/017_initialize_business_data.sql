-- Initialize Coffee Shop OS business data.
-- Keeps stores and profiles intact, then clears operational/demo records so real data can be imported.

truncate table
  public.cash_transactions,
  public.expense_records,
  public.month_close_snapshots,
  public.commission_rules,
  public.shifts,
  public.employees,
  public.stock_count_items,
  public.stock_counts,
  public.waste_records,
  public.sales_order_items,
  public.sales_orders,
  public.product_aliases,
  public.recipes,
  public.products,
  public.purchase_order_items,
  public.purchase_orders,
  public.inventory_movements,
  public.inventory_items
restart identity cascade;
