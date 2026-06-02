import * as XLSX from "xlsx";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

function orderWorkbookBlob() {
  const rows = [
    ["流水号", "订单类型", "所属门店", "下单人信息", "手机号码", "应付金额(元)", "实付金额(元)", "优惠金额(元)", "支付状态", "支付方式", "商品信息", "下单时间", "就餐类型", "订单状态", "就餐方式", "桌位号", "就餐人数", "订单来源", "商家备注"],
    ["Q1", "叫号取餐", "香律Cafe&Bar", "", "", 86, 86, 0, "已支付", "微信", "拿铁 x1,Gin Tonic x1", "2026-05-14 15:31:47", "叫号取餐", "已完成", "店内就餐", "", "0人", "收银台", ""],
    ["Q2", "叫号取餐", "香律Cafe&Bar", "", "", 21, 21, 0, "未支付", "微信", "美式（深烘） x1", "2026-05-14 16:31:47", "叫号取餐", "已取消", "店内就餐", "", "0人", "收银台", ""],
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Worksheet");
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function productWorkbookBlob() {
  const rows = [
    ["排序", "商品名称", "商品简介", "商品分类", "商品标签", "商品角标", "拼音助记码", "初始销量", "商品图片", "商品单位", "销售价格（元）", "成本价（元）", "包装费（元）", "初始库存", "商品重量", "商品条码", "商品编码", "售卖渠道", "商品状态", "商品详情图", "门店ID", ""],
    [1, "橙C美式", "橙香美式", "经典咖啡", "", "", "", 0, "", "", 28, 0, 0, 999, 1, "", "", "外卖,店内", "上架", "", 3038, ""],
    [2, "开心果", "佐酒小食", "佐酒小食", "", "", "", 0, "", "", 25, 0, 0, 999, 1, "", "", "外卖,店内", "上架", "", 3038, ""],
    [3, "发夹", "非经营商品", "「Star」手工发夹系列", "", "", "", 0, "", "", 9.9, 0, 0, 999, 1, "", "", "外卖,店内", "上架", "", 3038, ""],
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Worksheet");
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

const checks = [
  {
    name: "health",
    url: "/api/health",
    options: {},
    expect: (body) => body.includes('"ok":true'),
  },
  {
    name: "login page",
    url: "/login",
    options: {},
    expect: (body) => body.includes("owner@aromamelody.local"),
  },
  {
    name: "pwa manifest",
    url: "/manifest.json",
    options: {},
    expect: (body) => body.includes('"display": "standalone"') && body.includes("/icon.svg"),
  },
  {
    name: "service worker",
    url: "/sw.js",
    options: {},
    expect: (body) => body.includes("coffee-shop-os-v1") && body.includes("fetch"),
  },
  {
    name: "dashboard demo auth",
    url: "/dashboard",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("老板驾驶舱") && body.includes("今日营业额"),
  },
  {
    name: "inventory export demo auth",
    url: "/api/export/inventory",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("原料,分类,单位") && body.includes("库存价值"),
  },
  {
    name: "inventory template demo auth",
    url: "/api/templates/inventory-items",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("name,category,unit") && body.includes("safe_stock"),
  },
  {
    name: "import validation demo auth",
    url: "/api/imports/validate",
    options: {
      method: "POST",
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
      body: (() => {
        const formData = new FormData();
        formData.set("template", "inventory-items");
        formData.set("file", new Blob(["name,category,unit,safe_stock,cost_price\n中深烘咖啡豆,咖啡豆,g,800,0.18"], { type: "text/csv" }), "items.csv");
        return formData;
      })(),
    },
    expect: (body) => body.includes('"validRows":1') && body.includes('"errors":[]'),
  },
  {
    name: "sales batch validation demo auth",
    url: "/api/imports/validate",
    options: {
      method: "POST",
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
      body: (() => {
        const formData = new FormData();
        formData.set("template", "sales-batch");
        formData.set("file", new Blob(["sale_date,channel,payment_method,product_name,qty,unit_price\n2026-06-01,堂食,微信,拿铁,2,28"], { type: "text/csv" }), "sales.csv");
        return formData;
      })(),
    },
    expect: (body) => body.includes('"validRows":1') && body.includes("销售批量录入"),
  },
  {
    name: "real order workbook preview demo auth",
    url: "/api/imports/orders/preview",
    options: {
      method: "POST",
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
      body: (() => {
        const formData = new FormData();
        formData.set("files", orderWorkbookBlob(), "店内订单列表.xls");
        return formData;
      })(),
    },
    expect: (body) => body.includes('"orderCount":1') && body.includes('"lineCount":2') && body.includes("拿铁"),
  },
  {
    name: "product catalog workbook preview demo auth",
    url: "/api/imports/products/preview",
    options: {
      method: "POST",
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
      body: (() => {
        const formData = new FormData();
        formData.set("file", productWorkbookBlob(), "商品导出.xls");
        return formData;
      })(),
    },
    expect: (body) => body.includes('"importableCount":2') && body.includes('"skippedCount":1') && body.includes("橙C美式"),
  },
  {
    name: "product catalog workbook import demo auth",
    url: "/api/imports/products/import",
    options: {
      method: "POST",
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
      body: (() => {
        const formData = new FormData();
        formData.set("file", productWorkbookBlob(), "商品导出.xls");
        return formData;
      })(),
    },
    expect: (body) => body.includes('"mode":"demo"') && body.includes('"simulatedCount":2') && body.includes("不会写入真实数据库"),
  },
  {
    name: "product catalog import page demo auth",
    url: "/imports/products",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("商品导出接入") && body.includes("生成商品预览"),
  },
  {
    name: "real order workbook import demo auth",
    url: "/api/imports/orders/import",
    status: 422,
    options: {
      method: "POST",
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
      body: (() => {
        const formData = new FormData();
        formData.set("files", orderWorkbookBlob(), "店内订单列表.xls");
        return formData;
      })(),
    },
    expect: (body) => body.includes("有订单商品尚未匹配到系统产品") && body.includes("拿铁") && body.includes("Gin Tonic"),
  },
  {
    name: "product aliases page demo auth",
    url: "/products/aliases",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("商品别名映射") && body.includes("新增别名"),
  },
  {
    name: "replenishment page demo auth",
    url: "/inventory/replenishment",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("补货建议") && body.includes("建议预算"),
  },
  {
    name: "replenishment export demo auth",
    url: "/api/export/replenishment",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("建议采购") && body.includes("建议预算"),
  },
  {
    name: "month close page demo auth",
    url: "/finance/month-close",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("月结快照") && body.includes("生成月结快照"),
  },
  {
    name: "month close export demo auth",
    url: "/api/export/month-close",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("月份,收入") && body.includes("现金余额"),
  },
  {
    name: "mobile stock count page demo auth",
    url: "/stock-counts/mobile",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("移动盘点") && body.includes("完成盘点"),
  },
  {
    name: "backup manifest demo auth",
    url: "/api/backup/manifest",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes('"reports"') && body.includes("/api/export/inventory"),
  },
  {
    name: "backup page demo auth",
    url: "/backup",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("数据备份中心") && body.includes("下载 CSV"),
  },
  {
    name: "quality center demo auth",
    url: "/quality",
    options: {
      headers: {
        cookie: "coffee-shop-os-demo-auth=owner",
      },
    },
    expect: (body) => body.includes("经营异常中心") && body.includes("异常总数"),
  },
];

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.url}`, check.options);
  const body = await response.text();

  const expectedStatus = check.status ?? 200;
  if (response.status !== expectedStatus || !check.expect(body)) {
    console.error(`Smoke check failed: ${check.name}`);
    console.error(`Status: ${response.status}`);
    process.exit(1);
  }

  console.log(`✓ ${check.name}`);
}
