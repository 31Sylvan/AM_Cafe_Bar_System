# Coffee Shop OS V1

社区咖啡店经营管理系统，技术栈为 Next.js 15、TypeScript、TailwindCSS、Supabase/PostgreSQL、Supabase Auth，面向 PC 后台优先并支持移动端/PWA。

## 已实现范围

- Supabase migration：门店、用户档案、库存原料、采购单、采购明细、库存流水
- RLS：老板/店员角色隔离，同门店数据隔离
- 库存规则：库存余额通过 `inventory_movements` 聚合，禁止直接维护库存数量
- 采购规则：采购完成通过 `complete_purchase_order` RPC 自动生成 `PURCHASE` 流水
- 单位约束：咖啡豆 `g`、奶/糖浆/酒 `ml`、耗材 `pcs`、食品 `g/pcs`
- Phase 2：产品、配方、销售、损耗、盘点，销售/损耗/盘点均自动生成库存流水
- Phase 3：支出、现金流水、成本汇总、利润表、现金流
- Phase 4：员工、排班、绩效、提成规则与奖金分配
- Phase 5：老板驾驶舱排行、报表中心、ECharts 图表
- 页面：登录、仪表盘、库存、采购、产品配方、销售、损耗、盘点、财务、员工、排班、绩效、提成、报表

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

健康检查：

```bash
curl http://localhost:3000/api/health
```

本地冒烟检查：

```bash
npm run smoke
```

`.env.local` 需要配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## 数据库初始化

在 Supabase SQL Editor 或 CLI 中依次执行：

```text
supabase/migrations/001_phase1_core.sql
supabase/migrations/002_phase2_operations.sql
supabase/migrations/003_phase3_finance.sql
supabase/migrations/004_phase4_staff.sql
supabase/migrations/005_phase5_reports.sql
supabase/migrations/007_quality_views.sql
supabase/migrations/008_storage_waste_photos.sql
supabase/migrations/009_void_operations.sql
supabase/migrations/010_void_aware_reports.sql
supabase/migrations/011_store_settings.sql
supabase/migrations/012_month_close_snapshots.sql
```

执行后会创建默认门店：

```text
Aroma Melody Cafe & Bar
00000000-0000-0000-0000-000000000001
```

创建 Supabase Auth 用户后，需要为用户插入 `profiles` 记录。老板示例：

```sql
insert into public.profiles (id, store_id, role, display_name, status)
values (
  '<auth.users.id>',
  '00000000-0000-0000-0000-000000000001',
  'owner',
  '老板',
  'active'
);
```

店员示例：

```sql
insert into public.profiles (id, store_id, role, display_name, status)
values (
  '<auth.users.id>',
  '00000000-0000-0000-0000-000000000001',
  'staff',
  '店员',
  'active'
);
```

如需快速演示产品和配方，可在核心 migration 和账号配置后执行：

```text
supabase/migrations/006_demo_seed.sql
```

## 验收流程

建议使用一组真实业务动作检查系统闭环：

1. 老板登录
2. 创建或确认库存原料
3. 录入采购，检查库存流水出现 `PURCHASE`
4. 创建产品和配方
5. 录入销售，检查库存流水出现 `SALE`
6. 录入损耗，检查库存流水出现 `WASTE`
7. 完成盘点，检查库存流水出现 `COUNT_ADJUST`
8. 录入支出，检查现金流和利润表更新
9. 创建员工和排班，检查员工绩效
10. 创建提成规则，检查奖金池分配
11. 打开报表中心，检查 ECharts 图表和排行

## 仍需接入的外部事项

当前代码侧 V1 模块已经闭环。上线前还需要在真实 Supabase 项目中执行 migrations、创建老板账号、配置 Vercel 环境变量，并按真实门店数据完成首批原料、产品和员工初始化。

## V2 进度

V2 已加入列表筛选、采购/销售/盘点详情页、CSV 初始化模板、CSV 导入预检、商品导出表接入、真实订单 Excel 接入、商品别名映射、补货建议、销售批量预检、月结快照和移动端盘点模式。详情见 `docs/V2.md`。

## V3 进度

V3 已开始加入生产运营增强：数据备份中心、备份清单 API、经营异常中心总览。详情见 `docs/V3.md`。
