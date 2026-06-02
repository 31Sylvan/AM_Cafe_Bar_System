"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type PreviewLine = {
  order_no: string;
  sale_date: string;
  channel: string;
  payment_method: string;
  product_name: string;
  qty: number;
  unit_price: number;
  order_amount: number;
  source: string;
};

type PreviewResult = {
  orderCount: number;
  lineCount: number;
  skippedCount: number;
  totalPaidAmount: number;
  warnings: string[];
  lines: PreviewLine[];
  csv: string;
};

type ImportResult = {
  mode?: "demo" | "supabase";
  orderCount?: number;
  lineCount?: number;
  skippedCount?: number;
  totalPaidAmount?: number;
  importedCount?: number;
  duplicateCount?: number;
  simulatedCount?: number;
  importedOrderIds?: string[];
  duplicateOrderNos?: string[];
  missingProducts?: string[];
  missingRecipes?: string[];
  warnings?: string[];
  error?: string;
};

export function OrderPreview() {
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const csvHref = useMemo(() => {
    if (!result?.csv) return null;
    return URL.createObjectURL(new Blob([`\uFEFF${result.csv}`], { type: "text/csv;charset=utf-8" }));
  }, [result]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setImportResult(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/imports/orders/preview", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "订单预检失败");
      return;
    }
    setResult(payload);
  }

  async function onImport() {
    setImporting(true);
    setError(null);
    setImportResult(null);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/imports/orders/import", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    setImporting(false);
    setImportResult(payload);

    if (!response.ok) {
      setError(payload.error ?? "订单导入失败");
    }
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5">
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700" htmlFor="files">订单 Excel 文件</label>
          <input
            id="files"
            name="files"
            type="file"
            accept=".xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            required
            onChange={(event) => setFiles(Array.from(event.currentTarget.files ?? []))}
            className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm"
          />
        </div>
        <Button disabled={loading}>
          <Upload className="h-4 w-4" />
          {loading ? "解析中" : "生成接入预览"}
        </Button>
      </form>

      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {result ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="有效订单" value={`${result.orderCount}`} />
            <Metric label="商品行" value={`${result.lineCount}`} />
            <Metric label="跳过订单" value={`${result.skippedCount}`} />
            <Metric label="实收合计" value={`¥${result.totalPaidAmount.toFixed(2)}`} />
          </div>

          {csvHref ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <a href={csvHref} download="sales-batch-normalized.csv">
                  <FileSpreadsheet className="h-4 w-4" />
                  下载标准销售 CSV
                </a>
              </Button>
              <Button onClick={onImport} disabled={importing || files.length === 0}>
                <CheckCircle2 className="h-4 w-4" />
                {importing ? "导入中" : "确认导入销售"}
              </Button>
            </div>
          ) : null}

          {importResult ? (
            <ImportResultPanel result={importResult} />
          ) : null}

          {result.warnings.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">接入提醒</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.warnings.slice(0, 8).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-md border border-stone-200">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-stone-100 text-xs font-medium text-stone-500">
                <tr>
                  <th className="px-4 py-3">日期</th>
                  <th className="px-4 py-3">渠道</th>
                  <th className="px-4 py-3">支付</th>
                  <th className="px-4 py-3">产品</th>
                  <th className="px-4 py-3">数量</th>
                  <th className="px-4 py-3">分摊单价</th>
                  <th className="px-4 py-3">订单号</th>
                  <th className="px-4 py-3">来源</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {result.lines.slice(0, 80).map((line, index) => (
                  <tr key={`${line.order_no}-${line.product_name}-${index}`}>
                    <td className="px-4 py-3">{line.sale_date}</td>
                    <td className="px-4 py-3">{line.channel}</td>
                    <td className="px-4 py-3">{line.payment_method}</td>
                    <td className="px-4 py-3 font-medium">{line.product_name}</td>
                    <td className="px-4 py-3">{line.qty}</td>
                    <td className="px-4 py-3">¥{line.unit_price}</td>
                    <td className="px-4 py-3">{line.order_no}</td>
                    <td className="px-4 py-3 text-stone-500">{line.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-stone-200 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function ImportResultPanel({ result }: { result: ImportResult }) {
  if (result.missingRecipes && result.missingRecipes.length > 0) {
    return (
      <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
        <div className="font-semibold">导入已停止：以下产品还没有配方，无法同步扣减库存</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.missingRecipes.slice(0, 40).map((name) => (
            <span key={name} className="rounded border border-orange-200 bg-white px-2 py-1">
              {name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (result.missingProducts && result.missingProducts.length > 0) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <div className="font-semibold">导入已停止：以下商品还没有匹配到系统产品</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {result.missingProducts.slice(0, 40).map((name) => (
            <span key={name} className="rounded border border-red-200 bg-white px-2 py-1">
              {name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <div className="font-semibold">{result.mode === "demo" ? "Demo 校验完成" : "导入完成"}</div>
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        <ResultStat label="正式导入" value={`${result.importedCount ?? 0}`} />
        <ResultStat label="重复跳过" value={`${result.duplicateCount ?? 0}`} />
        <ResultStat label="Demo 模拟" value={`${result.simulatedCount ?? 0}`} />
        <ResultStat label="商品行" value={`${result.lineCount ?? 0}`} />
      </div>
      {result.warnings && result.warnings.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-amber-900">
          {result.warnings.slice(0, 5).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-white/70 p-2">
      <div className="text-xs text-emerald-700">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
