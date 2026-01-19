"use client";

import { CopyButton } from "./copy-button";
import { QrRenderer } from "./qr-renderer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import type { QrRendererProps } from "./qr-renderer";

type QrPanelProps = {
  data: string;
  options: Omit<QrRendererProps, "data">;
};

export function QrPanel({ data, options }: QrPanelProps) {
  const trimmed = data.trim();

  return (
    <Card className="glass border border-[var(--border)]">
      <CardHeader>
        <CardTitle>二维码预览</CardTitle>
        <CardDescription>实时生成，可自定义样式与嵌入图片</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!trimmed ? (
          <div className="glass rounded-2xl p-6 text-sm text-[color:var(--muted)]">
            请输入内容后即可生成二维码。
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[color:var(--muted)]">二维码内容</p>
                <div className="max-w-[260px] truncate text-sm font-semibold text-[color:var(--ink)]">
                  {trimmed}
                </div>
              </div>
              <CopyButton value={trimmed} label="复制内容" />
            </div>
            <div className="glass flex items-center justify-center rounded-3xl p-6">
              <QrRenderer data={trimmed} {...options} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
