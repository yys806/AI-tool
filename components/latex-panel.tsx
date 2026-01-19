"use client";

import { BlockMath } from "react-katex";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { CopyButton } from "./copy-button";

type LatexPanelProps = {
  image: string | null;
  latex: string;
  error: string | null;
  loading: boolean;
};

export function LatexPanel({ image, latex, error, loading }: LatexPanelProps) {
  const hasLatex = Boolean(latex.trim());
  const markdownLatex = hasLatex ? `$${latex}$` : "";

  return (
    <Card className="glass border border-[var(--border)]">
      <CardHeader>
        <CardTitle>LaTeX 结果</CardTitle>
        <CardDescription>识别结果与可视化预览</CardDescription>
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

        {!loading && !error && !image ? (
          <div className="glass rounded-2xl p-6 text-sm text-[color:var(--muted)]">
            上传公式截图后即可识别。
          </div>
        ) : null}

        {!loading && !error && image ? (
          <div className="space-y-4">
            <div className="glass flex items-center justify-center rounded-2xl p-4">
              <img
                src={image}
                alt="公式图片预览"
                className="max-h-48 w-auto rounded-xl object-contain"
              />
            </div>

            {hasLatex ? (
              <>
                <div className="glass rounded-2xl p-4">
                  <BlockMath math={latex} />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[color:var(--muted)]">
                    Markdown 公式
                  </h4>
                  <CopyButton value={markdownLatex} />
                </div>
                <div className="glass rounded-2xl p-3">
                  <pre className="overflow-x-auto rounded-xl bg-[#101827] p-4 text-xs text-white">
                    <code>{markdownLatex}</code>
                  </pre>
                </div>
              </>
            ) : (
              <div className="text-sm text-[color:var(--muted)]">
                等待识别结果...
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
