"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export type PaperData = {
  contributions: string[];
  method: string;
  experiments: string;
  limitations: string;
};

type PaperPanelProps = {
  data: PaperData | null;
  error: string | null;
  loading: boolean;
};

export function PaperPanel({ data, error, loading }: PaperPanelProps) {
  return (
    <Card className="glass border border-[var(--border)]">
      <CardHeader>
        <CardTitle>速读结果</CardTitle>
        <CardDescription>贡献点、方法、实验设置与局限性</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-3 text-sm text-[color:var(--muted)]">
            <div className="h-4 w-40 animate-pulse rounded-full bg-black/10" />
            <div className="h-4 w-64 animate-pulse rounded-full bg-black/10" />
            <div className="h-4 w-52 animate-pulse rounded-full bg-black/10" />
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!loading && !error && !data ? (
          <div className="glass rounded-2xl p-6 text-sm text-[color:var(--muted)]">
            还没有生成内容，先输入摘要或段落。
          </div>
        ) : null}

        {!loading && !error && data ? (
          <div className="space-y-4">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-[color:var(--muted)]">贡献点</h4>
              {data.contributions?.length ? (
                <ul className="list-disc space-y-2 pl-5 text-sm text-[color:var(--ink)]">
                  {data.contributions.map((item, index) => (
                    <li key={`contrib-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-[color:var(--muted)]">未返回贡献点</div>
              )}
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-[color:var(--muted)]">方法</h4>
              <p className="text-sm text-[color:var(--ink)]">
                {data.method || "未返回方法描述"}
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-[color:var(--muted)]">实验设置</h4>
              <p className="text-sm text-[color:var(--ink)]">
                {data.experiments || "未返回实验设置"}
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-[color:var(--muted)]">局限性</h4>
              <p className="text-sm text-[color:var(--ink)]">
                {data.limitations || "未返回局限性"}
              </p>
            </section>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
