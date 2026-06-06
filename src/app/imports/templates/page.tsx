import Link from "next/link";
import { ArrowRight, Download, FileSpreadsheet } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requirePermission, requireProfile } from "@/lib/auth";
import { extraImportTemplates, importTemplateDefinitions } from "@/lib/import-templates";

export const dynamic = "force-dynamic";

export default async function ImportTemplatesPage() {
  const profile = await requireProfile();
  requirePermission(profile, "import.manage");

  return (
    <AppShell profile={profile}>
      <PageHeader
        title="导入模板中心"
        description="按真实试运行顺序下载五张核心模板：原料库存、产品、配方、采购、订单销售。字段说明和下载文件共用同一份配置。"
        action={
          <Button asChild variant="secondary">
            <Link href="/imports">返回导入中心</Link>
          </Button>
        }
      />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>推荐导入顺序</CardTitle>
          <CardDescription>先打基础档案，再导入会产生库存和财务联动的业务流水。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-5">
            {importTemplateDefinitions.map((template, index) => (
              <div key={template.key} className="rounded-md border border-[var(--line)] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="muted">Step {index + 1}</Badge>
                  <FileSpreadsheet className="h-4 w-4 text-[var(--brand)]" />
                </div>
                <h2 className="mt-3 text-sm font-semibold text-stone-950">{template.businessName}</h2>
                <p className="mt-1 min-h-12 text-xs leading-5 text-stone-600">{template.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={template.href} prefetch={false}>
                      <Download className="h-3.5 w-3.5" />
                      下载
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={template.importPath}>
                      导入
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {importTemplateDefinitions.map((template) => (
          <Card key={template.key}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{template.title}</CardTitle>
                <CardDescription>
                  下载文件：<span className="font-mono text-stone-800">{template.filename}</span>
                </CardDescription>
              </div>
              <Button asChild>
                <Link href={template.href} prefetch={false}>
                  <Download className="h-4 w-4" />
                  下载模板
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <TableContainer>
                <Table className="min-w-[900px]">
                  <TableHeader className="bg-stone-100 text-stone-500">
                    <TableRow>
                      <TableHead>字段名</TableHead>
                      <TableHead>中文含义</TableHead>
                      <TableHead>必填</TableHead>
                      <TableHead>示例</TableHead>
                      <TableHead>填写说明</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {template.fields.map((field) => (
                      <TableRow key={field.key}>
                        <TableCell className="font-mono text-xs text-stone-900">{field.key}</TableCell>
                        <TableCell className="font-medium">{field.label}</TableCell>
                        <TableCell>
                          <Badge variant={field.required ? "warning" : "muted"}>{field.required ? "必填" : "选填"}</Badge>
                        </TableCell>
                        <TableCell>{field.example}</TableCell>
                        <TableCell className="max-w-xl text-stone-600">{field.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                首行示例：{template.rows[0].join("，")}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>补充模板</CardTitle>
          <CardDescription>只在特殊场景使用。真实试运行优先使用上面的五张核心模板。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {extraImportTemplates.map((template) => (
              <Button key={template.key} asChild variant="secondary" size="sm">
                <Link href={template.href} prefetch={false}>
                  <Download className="h-3.5 w-3.5" />
                  {template.title}
                </Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
