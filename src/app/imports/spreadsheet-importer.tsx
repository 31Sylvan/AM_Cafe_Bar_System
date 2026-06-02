"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ImportKind = "inventory" | "purchases" | "recipes";

type PreviewResult = {
  totalRows: number;
  importableCount: number;
  skippedCount: number;
  warnings: string[];
  errors: string[];
  lines: Record<string, unknown>[];
  skippedRows: Array<{ rowNo: number; name: string; reason: string }>;
  csv: string;
};

type ImportResult = {
  mode?: "demo" | "supabase";
  importableCount?: number;
  skippedCount?: number;
  upsertedCount?: number;
  adjustedCount?: number;
  purchaseOrderCount?: number;
  totalAmount?: number;
  replacedProductCount?: number;
  recipeLineCount?: number;
  simulatedCount?: number;
  missingItems?: string[];
  missingProducts?: string[];
  unitMismatches?: string[];
  warnings?: string[];
  error?: string;
};

const configs: Record<ImportKind, {
  title: string;
  fileLabel: string;
  previewEndpoint: string;
  importEndpoint: string;
  importButton: string;
  csvFilename: string;
  columns: Array<{ key: string; label: string; format?: (value: unknown) => string }>;
}> = {
  inventory: {
    title: "库存导入",
    fileLabel: "库存管理表",
    previewEndpoint: "/api/imports/inventory/preview",
    importEndpoint: "/api/imports/inventory/import",
    importButton: "确认导入库存",
    csvFilename: "inventory-normalized.csv",
    columns: [
      { key: "name", label: "原料" },
      { key: "category", label: "分类" },
      { key: "unit", label: "单位" },
      { key: "safe_stock", label: "安全库存" },
      { key: "cost_price", label: "成本价", format: money4 },
      { key: "actual_qty", label: "实际库存", format: emptyDash },
      { key: "status", label: "状态" },
    ],
  },
  purchases: {
    title: "采购导入",
    fileLabel: "采购明细表",
    previewEndpoint: "/api/imports/purchases/preview",
    importEndpoint: "/api/imports/purchases/import",
    importButton: "确认导入采购",
    csvFilename: "purchase-lines-normalized.csv",
    columns: [
      { key: "purchase_date", label: "日期" },
      { key: "supplier", label: "供应商" },
      { key: "payment_method", label: "付款" },
      { key: "item_name", label: "原料" },
      { key: "qty", label: "数量" },
      { key: "unit_price", label: "单价", format: money4 },
      { key: "amount", label: "金额", format: money2 },
    ],
  },
  recipes: {
    title: "配方导入",
    fileLabel: "配方表",
    previewEndpoint: "/api/imports/recipes/preview",
    importEndpoint: "/api/imports/recipes/import",
    importButton: "确认导入配方",
    csvFilename: "recipes-normalized.csv",
    columns: [
      { key: "product_name", label: "产品" },
      { key: "item_name", label: "原料" },
      { key: "qty", label: "用量" },
      { key: "unit", label: "单位" },
    ],
  },
};

function money2(value: unknown) {
  return `¥${Number(value ?? 0).toFixed(2)}`;
}

function money4(value: unknown) {
  return `¥${Number(value ?? 0).toFixed(4)}`;
}

function emptyDash(value: unknown) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

export function SpreadsheetImporter({ kind }: { kind: ImportKind }) {
  const config = configs[kind];
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const csvHref = useMemo(() => {
    if (!result?.csv) return null;
    return URL.createObjectURL(new Blob([`\uFEFF${result.csv}`], { type: "text/csv;charset=utf-8" }));
  }, [result]);

  async function submit(endpoint: string) {
    if (!file) return null;
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch(endpoint, { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw Object.assign(new Error(payload.error ?? "导入处理失败"), { payload });
    return payload;
  }

  async function onPreview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setImportResult(null);

    try {
      setResult(await submit(config.previewEndpoint));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "导入预览失败");
    } finally {
      setLoading(false);
    }
  }

  async function onImport() {
    setImporting(true);
    setError(null);
    setImportResult(null);

    try {
      setImportResult(await submit(config.importEndpoint));
    } catch (caught) {
      const payload = caught instanceof Error && "payload" in caught ? (caught as Error & { payload?: ImportResult }).payload : null;
      if (payload) setImportResult(payload);
      setError(caught instanceof Error ? caught.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
      <form onSubmit={onPreview} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700" htmlFor={`${kind}-file`}>{config.fileLabel}</label>
          <input
            id={`${kind}-file`}
            name="file"
            type="file"
            accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
            className="block w-full rounded-md border border-[#e7d9c8] bg-[#fffaf3] px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#0d3028] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          />
        </div>
        <Button disabled={loading || !file}>
          <Upload className="h-4 w-4" />
          {loading ? "解析中" : "生成导入预览"}
        </Button>
      </form>

      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {result ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric label="原始行数" value={`${result.totalRows}`} />
            <Metric label="可导入" value={`${result.importableCount}`} />
            <Metric label="跳过" value={`${result.skippedCount}`} />
          </div>

          <div className="flex flex-wrap gap-2">
            {csvHref ? (
              <Button asChild variant="secondary">
                <a href={csvHref} download={config.csvFilename}>
                  <FileSpreadsheet className="h-4 w-4" />
                  下载标准 CSV
                </a>
              </Button>
            ) : null}
            <Button onClick={onImport} disabled={importing || !file || result.importableCount === 0}>
              <CheckCircle2 className="h-4 w-4" />
              {importing ? "导入中" : config.importButton}
            </Button>
          </div>

          {importResult ? <ImportResultPanel result={importResult} /> : null}

          {result.warnings.length > 0 ? <MessageList tone="amber" title="导入提醒" items={result.warnings} /> : null}

          <TableContainer>
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  {config.columns.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.lines.slice(0, 100).map((line, index) => (
                  <TableRow key={index}>
                    {config.columns.map((column) => (
                      <TableCell key={column.key}>
                        {column.format ? column.format(line[column.key]) : emptyDash(line[column.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {result.skippedRows.length > 0 ? (
            <div className="rounded-md border border-[#e7d9c8] bg-white/60 p-4 text-sm">
              <h2 className="font-semibold">跳过行</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.skippedRows.slice(0, 60).map((row) => (
                  <span key={`${row.rowNo}-${row.reason}`} className="rounded border border-[#e7d9c8] bg-[#fffaf3] px-2 py-1 text-stone-600">
                    第 {row.rowNo} 行 {row.name || "未命名"} / {row.reason}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e7d9c8] bg-white/70 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function ImportResultPanel({ result }: { result: ImportResult }) {
  const blockingItems = [
    ...(result.missingItems ?? []).map((item) => `缺少原料：${item}`),
    ...(result.missingProducts ?? []).map((item) => `缺少产品：${item}`),
    ...(result.unitMismatches ?? []).map((item) => `单位不匹配：${item}`),
  ];

  if (blockingItems.length > 0) {
    return <MessageList tone="red" title="导入已停止" items={blockingItems} />;
  }

  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <div className="font-semibold">{result.mode === "demo" ? "Demo 校验完成" : "导入完成"}</div>
      <div className="mt-2 grid gap-2 md:grid-cols-4">
        <ResultStat label="写入/更新" value={`${result.upsertedCount ?? result.purchaseOrderCount ?? result.replacedProductCount ?? 0}`} />
        <ResultStat label="库存校准" value={`${result.adjustedCount ?? 0}`} />
        <ResultStat label="配方行" value={`${result.recipeLineCount ?? 0}`} />
        <ResultStat label="Demo 模拟" value={`${result.simulatedCount ?? 0}`} />
      </div>
      {typeof result.totalAmount === "number" ? <div className="mt-2">采购金额合计：¥{result.totalAmount.toFixed(2)}</div> : null}
      {result.warnings && result.warnings.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-amber-900">
          {result.warnings.slice(0, 6).map((warning) => (
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

function MessageList({ tone, title, items }: { tone: "amber" | "red"; title: string; items: string[] }) {
  const classes = tone === "red"
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`rounded-md border p-3 text-sm ${classes}`}>
      <div className="font-semibold">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.slice(0, 40).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
