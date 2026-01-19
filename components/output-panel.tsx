"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { CopyButton } from "./copy-button";
import { DiagramRenderer } from "./diagram-renderer";
import { MathRenderer } from "./math-renderer";

type Mode = "math" | "diagram";

type MathData = {
  explanation: string;
  symbols: { symbol: string; meaning: string }[];
  code: string;
};

type DiagramData = {
  mermaid: string;
};

type OutputPanelProps = {
  mode: Mode;
  input: string;
  loading: boolean;
  error: string | null;
  data: MathData | DiagramData | null;
};

export function OutputPanel({ mode, input, loading, error, data }: OutputPanelProps) {
  const [showMermaid, setShowMermaid] = useState(false);

  const isMath = mode === "math";

  return (
    <Card className="glass border border-[var(--border)]">
      <CardHeader>
        <CardTitle>生成结果</CardTitle>
        <CardDescription>
          {isMath ? "公式拆解与可执行代码" : "自动化架构流程图"}
        </CardDescription>
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
            还没有生成内容，先在左侧输入吧。
          </div>
        ) : null}

        {!loading && !error && data ? (
          <>
            {isMath ? (
              <MathRenderer
                latex={input}
                explanation={(data as MathData).explanation}
                symbols={(data as MathData).symbols}
                code={(data as MathData).code}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
                    <Switch
                      checked={showMermaid}
                      onCheckedChange={setShowMermaid}
                      aria-label="显示 Mermaid 代码"
                    />
                    <span className="inline-flex items-center gap-2">
                      {showMermaid ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {showMermaid ? "隐藏 Mermaid 代码" : "显示 Mermaid 代码"}
                    </span>
                  </div>
                  <CopyButton value={(data as DiagramData).mermaid} label="复制代码" />
                </div>

                {showMermaid ? (
                  <pre className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[#101827] p-4 text-xs text-white">
                    <code>{(data as DiagramData).mermaid}</code>
                  </pre>
                ) : null}

                <DiagramRenderer code={(data as DiagramData).mermaid} />
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
