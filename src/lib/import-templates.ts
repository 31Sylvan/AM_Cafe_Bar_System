export type ImportTemplateField = {
  key: string;
  label: string;
  required: boolean;
  description: string;
  example: string;
};

export type ImportTemplateDefinition = {
  key: string;
  title: string;
  businessName: string;
  filename: string;
  href: string;
  description: string;
  importPath: string;
  fields: ImportTemplateField[];
  rows: string[][];
};

export const importTemplateDefinitions = [
  {
    key: "inventory-import",
    title: "原料库存导入模板",
    businessName: "原料库存表",
    filename: "inventory-import-template.csv",
    href: "/api/templates/inventory-import",
    importPath: "/imports/inventory",
    description: "建立原料档案、分类单位、成本价、安全库存和当前实际库存。导入 actual_qty 会生成盘点调整流水。",
    fields: [
      { key: "name", label: "原料名称", required: true, description: "库存中心里的唯一原料名。", example: "中深烘咖啡豆" },
      { key: "category", label: "原料分类", required: true, description: "咖啡豆、奶类、糖浆、酒类、耗材、食品。", example: "咖啡豆" },
      { key: "unit", label: "单位", required: true, description: "按分类限制填写，咖啡豆 g，奶类/糖浆/酒类 ml，耗材 pcs。", example: "g" },
      { key: "specification", label: "规格", required: false, description: "采购或盘点时方便识别的包装规格。", example: "1kg/袋" },
      { key: "safe_stock", label: "安全库存", required: true, description: "低于这个数会进入库存预警。", example: "800" },
      { key: "cost_price", label: "单位成本", required: true, description: "每 g、ml 或 pcs 的成本。", example: "0.18" },
      { key: "actual_qty", label: "当前实际库存", required: true, description: "当前真实库存数量，用于初始化库存余额。", example: "2500" },
      { key: "status", label: "状态", required: false, description: "active 为启用，inactive 为停用。", example: "active" },
    ],
    rows: [
      ["中深烘咖啡豆", "咖啡豆", "g", "1kg/袋", "800", "0.18", "2500", "active"],
      ["全脂牛奶", "奶类", "ml", "1L/盒", "3000", "0.012", "12000", "active"],
    ],
  },
  {
    key: "products",
    title: "产品导入模板",
    businessName: "产品表",
    filename: "products-template.csv",
    href: "/api/templates/products",
    importPath: "/imports/products",
    description: "建立可售卖产品档案。真实小程序商品导出表也可以直接走商品接入页解析。",
    fields: [
      { key: "name", label: "产品名称", required: true, description: "系统产品名，后续配方和订单匹配都按这个名称关联。", example: "拿铁" },
      { key: "category", label: "产品分类", required: true, description: "咖啡、茶饮、鸡尾酒、啤酒、食品。", example: "咖啡" },
      { key: "sale_price", label: "售价", required: true, description: "门店标准售价。真实订单导入时以订单实付为准。", example: "28" },
      { key: "status", label: "状态", required: false, description: "active 为启用，inactive 为停用。", example: "active" },
    ],
    rows: [["拿铁", "咖啡", "28", "active"]],
  },
  {
    key: "recipes",
    title: "配方导入模板",
    businessName: "配方表",
    filename: "recipes-template.csv",
    href: "/api/templates/recipes",
    importPath: "/imports/recipes",
    description: "把产品和原料用量打通。订单导入后会按配方自动扣库存并计算理论成本。",
    fields: [
      { key: "product_name", label: "产品名称", required: true, description: "必须和产品表里的产品名称一致。", example: "拿铁" },
      { key: "item_name", label: "原料名称", required: true, description: "必须和原料库存表里的原料名称一致。", example: "中深烘咖啡豆" },
      { key: "qty", label: "单杯用量", required: true, description: "每卖出 1 件产品消耗的原料数量。", example: "18" },
      { key: "unit", label: "单位", required: true, description: "必须和原料单位一致。", example: "g" },
    ],
    rows: [
      ["拿铁", "中深烘咖啡豆", "18", "g"],
      ["拿铁", "全脂牛奶", "250", "ml"],
    ],
  },
  {
    key: "purchases",
    title: "采购导入模板",
    businessName: "采购表",
    filename: "purchase-lines-template.csv",
    href: "/api/templates/purchases",
    importPath: "/imports/purchases",
    description: "导入采购明细后，系统按供应商、日期、付款方式分组生成采购单，并同步库存入库和现金支出。",
    fields: [
      { key: "supplier", label: "供应商", required: true, description: "供应商或采购来源。", example: "本地烘焙商" },
      { key: "purchase_date", label: "采购日期", required: true, description: "格式必须是 YYYY-MM-DD。", example: "2026-06-01" },
      { key: "payment_method", label: "付款方式", required: false, description: "微信、支付宝、银行卡、现金；空值默认微信。", example: "微信" },
      { key: "item_name", label: "原料名称", required: true, description: "必须先存在于原料库存表。", example: "中深烘咖啡豆" },
      { key: "qty", label: "采购数量", required: true, description: "本次采购入库数量。", example: "2000" },
      { key: "unit_price", label: "采购单价", required: true, description: "每单位采购成本。", example: "0.38" },
    ],
    rows: [["本地烘焙商", "2026-06-01", "微信", "中深烘咖啡豆", "2000", "0.38"]],
  },
  {
    key: "sales-batch",
    title: "销售批量导入模板",
    businessName: "订单销售表",
    filename: "sales-batch-template.csv",
    href: "/api/templates/sales-batch",
    importPath: "/imports/orders",
    description: "手工标准销售批量模板。小程序真实订单 Excel 建议直接走订单接入页上传原始表。",
    fields: [
      { key: "sale_date", label: "销售日期", required: true, description: "格式必须是 YYYY-MM-DD。", example: "2026-06-01" },
      { key: "channel", label: "销售渠道", required: true, description: "堂食、小程序、美团、饿了么。", example: "堂食" },
      { key: "payment_method", label: "收款方式", required: true, description: "微信、支付宝、银行卡、现金。", example: "微信" },
      { key: "product_name", label: "产品名称", required: true, description: "必须匹配系统产品或商品别名。", example: "拿铁" },
      { key: "qty", label: "销售数量", required: true, description: "销售件数。", example: "2" },
      { key: "unit_price", label: "成交单价", required: true, description: "订单成交单价。", example: "28" },
      { key: "external_order_no", label: "外部订单号", required: false, description: "用于防止重复导入。", example: "POS-20260601-001" },
    ],
    rows: [["2026-06-01", "堂食", "微信", "拿铁", "2", "28", "POS-20260601-001"]],
  },
] satisfies ImportTemplateDefinition[];

export const importTemplateMap = Object.fromEntries(importTemplateDefinitions.map((template) => [template.key, template]));

export const extraImportTemplates = [
  {
    key: "inventory-items",
    title: "原料档案模板",
    businessName: "原料档案表",
    filename: "inventory-items-template.csv",
    href: "/api/templates/inventory-items",
    importPath: "/imports",
    description: "只维护原料档案，不初始化当前库存。真实试运行优先使用原料库存导入模板。",
    fields: [
      { key: "name", label: "原料名称", required: true, description: "库存中心里的唯一原料名。", example: "中深烘咖啡豆" },
      { key: "category", label: "原料分类", required: true, description: "咖啡豆、奶类、糖浆、酒类、耗材、食品。", example: "咖啡豆" },
      { key: "unit", label: "单位", required: true, description: "按分类限制填写。", example: "g" },
      { key: "specification", label: "规格", required: false, description: "采购或盘点时方便识别的包装规格。", example: "1kg/袋" },
      { key: "safe_stock", label: "安全库存", required: true, description: "低于这个数会进入库存预警。", example: "800" },
      { key: "cost_price", label: "单位成本", required: true, description: "每 g、ml 或 pcs 的成本。", example: "0.18" },
      { key: "status", label: "状态", required: false, description: "active 为启用，inactive 为停用。", example: "active" },
    ],
    rows: [["中深烘咖啡豆", "咖啡豆", "g", "1kg/袋", "800", "0.18", "active"]],
  },
] satisfies ImportTemplateDefinition[];
