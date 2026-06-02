insert into public.inventory_items (store_id, name, category, unit, specification, safe_stock, cost_price, status)
values
  ('00000000-0000-0000-0000-000000000001', '中深烘咖啡豆', '咖啡豆', 'g', '1kg/袋', 800, 0.18, 'active'),
  ('00000000-0000-0000-0000-000000000001', '全脂牛奶', '奶类', 'ml', '1L/盒', 3000, 0.012, 'active'),
  ('00000000-0000-0000-0000-000000000001', '香草糖浆', '糖浆', 'ml', '750ml/瓶', 500, 0.045, 'active'),
  ('00000000-0000-0000-0000-000000000001', '金酒', '酒类', 'ml', '700ml/瓶', 400, 0.22, 'active'),
  ('00000000-0000-0000-0000-000000000001', '汤力水', '酒类', 'ml', '200ml/瓶', 1000, 0.03, 'active'),
  ('00000000-0000-0000-0000-000000000001', '外带杯', '耗材', 'pcs', '12oz', 50, 0.65, 'active')
on conflict (store_id, name) do nothing;

insert into public.products (store_id, name, category, sale_price, status)
values
  ('00000000-0000-0000-0000-000000000001', '拿铁', '咖啡', 28, 'active'),
  ('00000000-0000-0000-0000-000000000001', '香草拿铁', '咖啡', 32, 'active'),
  ('00000000-0000-0000-0000-000000000001', 'Gin Tonic', '鸡尾酒', 58, 'active')
on conflict (store_id, name) do nothing;

insert into public.recipes (store_id, product_id, item_id, qty, unit)
select p.store_id, p.id, i.id, x.qty, i.unit
from (
  values
    ('拿铁', '中深烘咖啡豆', 18::numeric),
    ('拿铁', '全脂牛奶', 250::numeric),
    ('香草拿铁', '中深烘咖啡豆', 18::numeric),
    ('香草拿铁', '全脂牛奶', 240::numeric),
    ('香草拿铁', '香草糖浆', 15::numeric),
    ('Gin Tonic', '金酒', 45::numeric),
    ('Gin Tonic', '汤力水', 120::numeric)
) as x(product_name, item_name, qty)
join public.products p on p.name = x.product_name and p.store_id = '00000000-0000-0000-0000-000000000001'
join public.inventory_items i on i.name = x.item_name and i.store_id = p.store_id
on conflict (store_id, product_id, item_id) do nothing;
