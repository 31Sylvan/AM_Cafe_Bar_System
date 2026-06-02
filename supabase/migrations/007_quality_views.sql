create or replace view public.v_products_without_recipe
with (security_invoker = true) as
select p.store_id, p.id as product_id, p.name, p.category, p.sale_price, p.status
from public.products p
left join public.recipes r on r.product_id = p.id and r.store_id = p.store_id
where p.status = 'active'
group by p.store_id, p.id
having count(r.id) = 0;

create or replace view public.v_inventory_negative_balances
with (security_invoker = true) as
select *
from public.v_inventory_balances
where current_qty < 0;
