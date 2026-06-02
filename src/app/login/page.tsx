import { Coffee } from "lucide-react";
import { signInAction } from "@/lib/actions/auth";
import { getDemoCredentials, isDemoAuthEnabled } from "@/lib/demo-auth";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const configured = hasSupabaseEnv();
  const demoEnabled = !configured && isDemoAuthEnabled();
  const demo = getDemoCredentials();

  return (
    <main className="grid min-h-screen bg-stone-50 lg:grid-cols-[1fr_440px]">
      <section className="hidden border-r border-stone-200 bg-[url('/coffee-bg.svg')] bg-cover bg-center lg:block">
        <div className="flex h-full flex-col justify-between bg-stone-950/35 p-10 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15">
              <Coffee className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Coffee Shop OS</div>
              <div className="text-sm text-white/75">Aroma Melody Cafe & Bar</div>
            </div>
          </div>
          <div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight">早咖夜酒门店的库存、成本和现金流中枢</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/75">
              覆盖库存、采购、配方、销售、损耗、盘点、利润、现金流、排班、绩效和报表，数据模型已预留多门店扩展。
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Coffee className="h-8 w-8 text-emerald-700" />
            <h1 className="mt-4 text-2xl font-semibold">Coffee Shop OS</h1>
          </div>
          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">登录后台</h2>
            <p className="mt-1 text-sm text-stone-500">使用 Supabase Auth 邮箱密码登录。</p>

            {!configured && !demoEnabled ? (
              <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                请先在 `.env.local` 配置 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
              </div>
            ) : null}

            {demoEnabled ? (
              <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                本地演示账号：{demo.email} / {demo.password}
              </div>
            ) : null}

            {params.error ? (
              <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{params.error}</div>
            ) : null}

            <form action={signInAction} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input id="email" name="email" type="email" autoComplete="email" defaultValue={demoEnabled ? demo.email : ""} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" defaultValue={demoEnabled ? demo.password : ""} required />
              </div>
              <Button className="w-full" disabled={!configured && !demoEnabled}>
                登录
              </Button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
