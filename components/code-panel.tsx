"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CopyButton } from "./copy-button";

export type CodeData = {
  explanation: string;
  pseudocode: string;
};

type CodePanelProps = {
  data: CodeData | null;
  error: string | null;
  loading: boolean;
};

export function CodePanel({ data, error, loading }: CodePanelProps) {
  return (
    <Card className="glass border border-[var(--border)]">
      <CardHeader>
        <CardTitle>代码解析</CardTitle>
        <CardDescription>解释 + 伪代码结构化输出</CardDescription>
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
            还没有生成内容，先粘贴代码。
          </div>
        ) : null}

        {!loading && !error && data ? (
          <div className="space-y-4">
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-[color:var(--muted)]">解释</h4>
              <p className="text-sm text-[color:var(--ink)]">{data.explanation}</p>
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[color:var(--muted)]">
                  伪代码
                </h4>
                <CopyButton value={data.pseudocode} />
              </div>
              <pre className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[#101827] p-4 text-xs text-white">
                <code>{data.pseudocode}</code>
              </pre>
            </section>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
