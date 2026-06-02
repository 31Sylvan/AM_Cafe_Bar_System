import * as XLSX from "xlsx";
import { toCsv } from "@/lib/export/csv";
import type { PaymentMethod, SalesChannel } from "@/lib/types";

export type NormalizedOrderLine = {
  order_no: string;
  sale_date: string;
  channel: SalesChannel;
  payment_method: PaymentMethod;
  product_name: string;
  qty: number;
  unit_price: number;
  order_amount: number;
  source: string;
};

export type OrderPreviewResult = {
  sourceFiles: string[];
  orderCount: number;
  lineCount: number;
  skippedCount: number;
  totalPaidAmount: number;
  warnings: string[];
  lines: NormalizedOrderLine[];
  csv: string;
};

function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  const text = String(value ?? "").trim();
  if (text.includes("微信")) return "微信";
  if (text.includes("支付宝")) return "支付宝";
  if (text.includes("银行卡")) return "银行卡";
  if (text.includes("现金")) return "现金";
  if (text.includes("余额")) return "微信";
  return null;
}

function normalizeChannel(row: Record<string, unknown>, fallback: SalesChannel): SalesChannel {
  const source = String(row["订单来源"] ?? "");
  if (source.includes("微信小程序")) return "小程序";

  const orderType = String(row["订单类型"] ?? "");
  if (orderType.includes("外卖")) return "饿了么";

  return fallback;
}

function dateOnly(value: unknown) {
  const text = String(value ?? "").trim();
  return text.slice(0, 10);
}

function parseItems(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return [];

  return text.split(",").map((part) => {
    const match = part.trim().match(/^(.*?)\s*x\s*(\d+(?:\.\d+)?)$/i);
    if (!match) {
      return { name: part.trim(), qty: 1 };
    }

    return {
      name: match[1].trim(),
      qty: Number(match[2]),
    };
  }).filter((item) => item.name && Number.isFinite(item.qty) && item.qty > 0);
}

function rowsFromWorkbook(bytes: ArrayBuffer) {
  const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

export async function previewOrderWorkbooks(files: File[]): Promise<OrderPreviewResult> {
  const lines: NormalizedOrderLine[] = [];
  const warnings: string[] = [];
  let orderCount = 0;
  let skippedCount = 0;
  let totalPaidAmount = 0;

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const rows = rowsFromWorkbook(bytes);
    const fallbackChannel: SalesChannel = file.name.includes("自提") ? "小程序" : "堂食";

    for (const row of rows) {
      const paidStatus = String(row["支付状态"] ?? "").trim();
      const orderStatus = String(row["订单状态"] ?? "").trim();

      if (paidStatus !== "已支付" || orderStatus !== "已完成") {
        skippedCount += 1;
        continue;
      }

      const paidAmount = Number(row["实付金额(元)"] ?? 0);
      const paymentMethod = normalizePaymentMethod(row["支付方式"]);
      const items = parseItems(row["商品信息"]);

      if (!Number.isFinite(paidAmount) || paidAmount <= 0 || !paymentMethod || items.length === 0) {
        skippedCount += 1;
        continue;
      }

      const totalQty = items.reduce((sum, item) => sum + item.qty, 0);
      const allocatedUnitPrice = Number((paidAmount / totalQty).toFixed(2));
      const orderNo = String(row["流水号"] ?? "").trim() || `NO-${orderCount + 1}`;
      const saleDate = dateOnly(row["下单时间"]);
      const channel = normalizeChannel(row, fallbackChannel);

      if (items.length > 1) {
        warnings.push(`${file.name} / ${orderNo} 是多商品订单，已按数量平均分摊实付金额。正式入库前建议用系统产品标价做折扣比例分摊。`);
      }

      orderCount += 1;
      totalPaidAmount += paidAmount;

      for (const item of items) {
        lines.push({
          order_no: orderNo,
          sale_date: saleDate,
          channel,
          payment_method: paymentMethod,
          product_name: item.name,
          qty: item.qty,
          unit_price: allocatedUnitPrice,
          order_amount: Number(paidAmount.toFixed(2)),
          source: file.name.includes("自提") ? "自提订单" : "店内订单",
        });
      }
    }
  }

  const csv = toCsv(
    ["sale_date", "channel", "payment_method", "product_name", "qty", "unit_price", "external_order_no"],
    lines.map((line) => [line.sale_date, line.channel, line.payment_method, line.product_name, line.qty, line.unit_price, line.order_no]),
  );

  return {
    sourceFiles: files.map((file) => file.name),
    orderCount,
    lineCount: lines.length,
    skippedCount,
    totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
    warnings: Array.from(new Set(warnings)).slice(0, 50),
    lines,
    csv,
  };
}
