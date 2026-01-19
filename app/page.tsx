"use client";

import { useMemo, useState } from "react";
import { Sigma, Workflow } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { OutputPanel } from "../components/output-panel";

type Mode = "math" | "diagram";

const MODEL_OPTIONS = [
  { value: "deepseek-ai/DeepSeek-V3.2", label: "DeepSeek V3.2" },
  { value: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
  { value: "Pro/zai-org/GLM-4.7", label: "GLM-4.7 Pro" },
] as const;

type ModelId = (typeof MODEL_OPTIONS)[number]["value"];

type MathData = {
  explanation: string;
  symbols: { symbol: string; meaning: string }[];
  code: string;
};

type DiagramData = {
  mermaid: string;
};

type ApiResponse = {
  mode: Mode;
  input: string;
  data: MathData | DiagramData;
};

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("math");
  const [model, setModel] = useState<ModelId>("deepseek-ai/DeepSeek-V3.2");
  const [input, setInput] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [data, setData] = useState<MathData | DiagramData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder = useMemo(() => {
    return mode === "math"
      ? "例如：J(\\theta) = -\\frac{1}{m} \\sum_{i=1}^{m} y^{(i)} \\log \\hat{y}^{(i)}"
      : "例如：用户登录，如果 Token 有效则查询 DB，否则返回 401。";
  }, [mode]);

  const actionLabel = useMemo(() => {
    return loading ? "生成中..." : mode === "math" ? "解码" : "生成图表";
  }, [loading, mode]);

  const handleModeChange = (value: string) => {
    if (value !== "math" && value !== "diagram") return;
    setMode(value);
    setInput("");
    setLastInput("");
    setData(null);
    setError(null);
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("请输入内容后再生成。");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, input: trimmed, model }),
      });

      if (!response.ok) {
        const rawText = await response.text();
        let message = "请求失败，请稍后重试。";

        try {
          const payload = JSON.parse(rawText) as { error?: string } | null;
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          message = `请求失败 (HTTP ${response.status})`;
        }

        throw new Error(message);
      }

      const payload = (await response.json()) as ApiResponse;
      setData(payload.data);
      setLastInput(payload.input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen px-6 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 right-10 h-64 w-64 rounded-full bg-[color:var(--accent)]/20 blur-[120px]" />
        <div className="absolute bottom-8 left-10 h-72 w-72 rounded-full bg-[color:var(--accent-2)]/20 blur-[140px]" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          AI Academic Cockpit
        </div>
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
          AI 学术驾驶舱
        </h1>
        <p className="max-w-2xl text-sm text-[color:var(--muted)] sm:text-base">
          在一个界面内完成公式解码与架构绘图，把阅读论文和项目设计变成更高效的闭环。
        </p>
      </header>

      <section className="mx-auto mt-8 w-full max-w-6xl animate-fade-up">
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="w-full justify-start gap-2 sm:w-auto">
            <TabsTrigger value="math">
              <Sigma className="h-4 w-4" />
              🧩 公式翻译官
            </TabsTrigger>
            <TabsTrigger value="diagram">
              <Workflow className="h-4 w-4" />
              📊 架构图生成器
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      <main className="mx-auto mt-6 grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="glass animate-fade-up">
          <CardHeader>
            <CardTitle>{mode === "math" ? "输入公式" : "输入描述"}</CardTitle>
            <CardDescription>
              {mode === "math"
                ? "粘贴 LaTeX 公式，我们会返回中文解释与代码实现。"
                : "用自然语言描述流程，我们会生成 Mermaid 流程图。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="model"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
              >
                模型选择
              </label>
              <select
                id="model"
                value={model}
                onChange={(event) => setModel(event.target.value as ModelId)}
                disabled={loading}
                className="h-11 w-full rounded-full border border-[var(--border)] bg-white/70 px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              >
                {MODEL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.value})
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              placeholder={placeholder}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--muted)]">
                {mode === "math"
                  ? "支持 LaTeX 公式，推荐使用 \\frac、\\sum 等结构。"
                  : "支持条件、分支与循环的流程描述。"}
              </span>
              <Button onClick={handleSubmit} disabled={loading}>
                {actionLabel}
              </Button>
            </div>
          </CardContent>
        </Card>

        <OutputPanel
          mode={mode}
          input={lastInput || input}
          loading={loading}
          error={error}
          data={data}
        />
      </main>
    </div>
  );
}
