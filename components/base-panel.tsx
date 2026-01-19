"use client";

import { CopyButton } from "./copy-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import type { BaseConversion } from "../lib/base-convert";

type BasePanelProps = {
  result: BaseConversion | null;
  error: string | null;
};

export function BasePanel({ result, error }: BasePanelProps) {
  return (
    <Card className="glass border border-[var(--border)]">
      <CardHeader>
        <CardTitle>转换结果</CardTitle>
        <CardDescription>各进制结果与快速复制</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!error && !result ? (
          <div className="glass rounded-2xl p-6 text-sm text-[color:var(--muted)]">
            请输入数值并点击转换。
          </div>
        ) : null}

        {!error && result ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[color:var(--muted)]">
                  {result.fromBase} 进制 → {result.toBase} 进制
                </p>
                <h4 className="text-lg font-semibold">转换结果</h4>
              </div>
              <CopyButton value={result.output} />
            </div>

            <div className="glass rounded-2xl p-4 text-xl font-semibold">
              {result.output}
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {result.all.map((item) => (
                <div
                  key={`base-${item.base}`}
                  className="glass rounded-2xl p-3 text-sm"
                >
                  <div className="font-semibold">{item.label}</div>
                  <div className="text-[color:var(--muted)]">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
