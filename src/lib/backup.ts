export type BackupReport = {
  key: string;
  name: string;
  description: string;
  href: string;
  ownerOnly: boolean;
};

export const backupReports: BackupReport[] = [
  {
    key: "inventory",
    name: "库存余额",
    description: "当前库存、安全库存、库存价值和预警状态。",
    href: "/api/export/inventory",
    ownerOnly: false,
  },
  {
    key: "movements",
    name: "库存流水",
    description: "采购、销售、损耗、盘点调整等全部库存审计轨迹。",
    href: "/api/export/movements",
    ownerOnly: false,
  },
  {
    key: "products",
    name: "产品报表",
    description: "产品销量、销售额、理论成本、毛利和毛利率。",
    href: "/api/export/products",
    ownerOnly: false,
  },
  {
    key: "waste",
    name: "损耗报表",
    description: "原料损耗数量、损耗金额和损耗次数。",
    href: "/api/export/waste",
    ownerOnly: false,
  },
  {
    key: "profit-loss",
    name: "利润表",
    description: "收入、成本、毛利、费用和净利润。",
    href: "/api/export/profit-loss",
    ownerOnly: true,
  },
  {
    key: "business-analysis",
    name: "经营分析",
    description: "按月生成包含利润表和现金流量表的 Excel 工作簿。",
    href: "/api/export/business-analysis",
    ownerOnly: true,
  },
  {
    key: "trial-validation",
    name: "真实数据验收",
    description: "核对订单导入后销售、库存扣减、现金流和利润表是否闭环。",
    href: "/api/export/trial-validation",
    ownerOnly: true,
  },
  {
    key: "costs",
    name: "成本分析",
    description: "理论成本、实际成本和成本差异。",
    href: "/api/export/costs",
    ownerOnly: true,
  },
  {
    key: "expenses",
    name: "支出记录",
    description: "房租、水电、工资、营销等支出明细。",
    href: "/api/export/expenses",
    ownerOnly: true,
  },
  {
    key: "cashflow",
    name: "现金流",
    description: "现金收入、支出、支付方式、来源单据和月度净现金流。",
    href: "/api/export/cashflow",
    ownerOnly: true,
  },
  {
    key: "employees",
    name: "员工绩效",
    description: "工时、班次、营业额/小时、迟到和请假次数。",
    href: "/api/export/employees",
    ownerOnly: true,
  },
  {
    key: "month-close",
    name: "月结快照",
    description: "已固化月份的利润、成本、现金余额和月结时间。",
    href: "/api/export/month-close",
    ownerOnly: true,
  },
  {
    key: "replenishment",
    name: "补货建议",
    description: "建议采购量、建议预算、预计可用天数和补货优先级。",
    href: "/api/export/replenishment",
    ownerOnly: true,
  },
];
