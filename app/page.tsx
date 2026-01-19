"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Settings, Sigma, Workflow } from "lucide-react";

import { ApiSettings } from "../components/api-settings";
import { BasePanel } from "../components/base-panel";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { OutputPanel } from "../components/output-panel";
import { convertBase, type BaseConversion } from "../lib/base-convert";

type AiMode = "math" | "diagram";
type Mode = AiMode | "base";

const STORAGE_KEY = "siliconflow_api_key";

const MODEL_OPTIONS = [
  { value: "deepseek-ai/DeepSeek-V3.2", label: "DeepSeek V3.2" },
  { value: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
  { value: "Pro/zai-org/GLM-4.7", label: "GLM-4.7 Pro" },
] as const;

type ModelId = (typeof MODEL_OPTIONS)[number]["value"];

const SYSTEM_PROMPTS: Record<AiMode, string> = {
  math:
    "你是一名数学和编程专家。请解码用户提供的 LaTeX 公式。你必须仅返回一个原始的 JSON 对象，包含以下三个字段：" +
    "1. explanation: 一段用中文通俗解释该公式数学含义的文字。" +
    "2. symbols: 一个数组，解释公式中关键符号的含义 (例如 [{ symbol: \"m\", meaning: \"样本数量\" }])。" +
    "3. code: 对应公式计算逻辑的 Python/NumPy/PyTorch 代码字符串。",
  diagram:
    "你是一名系统架构师。请将用户的描述转化为 Mermaid.js 的 flowchart 代码。仅返回代码块内容，" +
    "以 graph TD 或适当的类型开头。不要包含 markdown 格式标记。",
};

type MathData = {
  explanation: string;
  symbols: { symbol: string; meaning: string }[];
  code: string;
};

type DiagramData = {
  mermaid: string;
};

type ApiResponse = {
  mode: AiMode;
  input: string;
  data: MathData | DiagramData;
};

function stripCodeFences(text: string) {
  const match = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1)) as unknown;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeApiKey(value: string) {
  return value.trim().replace(/^Bearer\s+/i, "");
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("math");
  const [model, setModel] = useState<ModelId>("deepseek-ai/DeepSeek-V3.2");
  const [input, setInput] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [data, setData] = useState<MathData | DiagramData | null>(null);
  const [baseResult, setBaseResult] = useState<BaseConversion | null>(null);
  const [fromBase, setFromBase] = useState(10);
  const [toBase, setToBase] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setApiKey(stored);
  }, []);

  const placeholder = useMemo(() => {
    return mode === "math"
      ? "例如：J(\\theta) = -\\frac{1}{m} \\sum_{i=1}^{m} y^{(i)} \\log \\hat{y}^{(i)}"
      : mode === "diagram"
      ? "例如：用户登录，如果 Token 有效则查询 DB，否则返回 401。"
      : "例如：FFEE 或 0b101010";
  }, [mode]);

  const actionLabel = useMemo(() => {
    return loading ? "生成中..." : mode === "math" ? "解码" : "生成图表";
  }, [loading, mode]);

  const handleModeChange = (value: string) => {
    if (value !== "math" && value !== "diagram" && value !== "base") return;
    setMode(value);
    setInput("");
    setLastInput("");
    setData(null);
    setBaseResult(null);
    setError(null);
    setLoading(false);
  };

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("请输入内容后再生成。");
      return;
    }

    if (mode === "base") {
      const { result, error: baseError } = convertBase(trimmed, fromBase, toBase);
      if (baseError) {
        setError(baseError);
        setBaseResult(null);
        return;
      }
      setError(null);
      setBaseResult(result || null);
      setLastInput(trimmed);
      return;
    }

    const normalizedKey = normalizeApiKey(apiKey);
    if (!normalizedKey) {
      setError("请先在设置中填写 SiliconFlow API Key。");
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${normalizedKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS[mode as AiMode] },
            { role: "user", content: trimmed },
          ],
          temperature: 0.2,
        }),
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

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const rawContent = payload?.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error("模型没有返回内容。");
      }

      const content = stripCodeFences(rawContent);

      if (mode === "math") {
        const parsed = parseJsonObject(content);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("模型未返回有效 JSON。");
        }

        const parsedData = parsed as MathData;
        setData({
          explanation: parsedData.explanation || "",
          symbols: Array.isArray(parsedData.symbols) ? parsedData.symbols : [],
          code: parsedData.code || "",
        });
      } else {
        setData({ mermaid: content });
      }

      setLastInput(trimmed);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "请求失败，可能是网络或 CORS 限制。";
      setError(message);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            AI Academic Cockpit
          </div>
          <Button
            type="button"
            variant="outline"
            className="gap-2 rounded-full"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
            设置
          </Button>
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
            <TabsTrigger value="base">
              <ArrowLeftRight className="h-4 w-4" />
              🔢 进制转换
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      <main className="mx-auto mt-6 grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="glass animate-fade-up">
          <CardHeader>
            <CardTitle>
              {mode === "math" ? "输入公式" : mode === "diagram" ? "输入描述" : "输入数值"}
            </CardTitle>
            <CardDescription>
              {mode === "math"
                ? "粘贴 LaTeX 公式，我们会返回中文解释与代码实现。"
                : mode === "diagram"
                ? "用自然语言描述流程，我们会生成 Mermaid 流程图。"
                : "设置输入/输出进制，完成任意进制之间的转换。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode !== "base" ? (
              <>
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
                    className="glass h-11 w-full rounded-full px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
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
              </>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
                  <div className="space-y-2">
                    <label
                      htmlFor="from-base"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      输入进制
                    </label>
                    <input
                      id="from-base"
                      type="number"
                      min={2}
                      max={36}
                      value={fromBase}
                      onChange={(event) => setFromBase(Number(event.target.value))}
                      className="glass h-11 w-full rounded-full px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    />
                  </div>
                  <div className="flex items-end justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        setFromBase(toBase);
                        setToBase(fromBase);
                      }}
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="to-base"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      输出进制
                    </label>
                    <input
                      id="to-base"
                      type="number"
                      min={2}
                      max={36}
                      value={toBase}
                      onChange={(event) => setToBase(Number(event.target.value))}
                      className="glass h-11 w-full rounded-full px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                />
              </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--muted)]">
                {mode === "math"
                  ? "支持 LaTeX 公式，推荐使用 \\frac、\\sum 等结构。"
                  : mode === "diagram"
                  ? "支持条件、分支与循环的流程描述。"
                  : "支持 2-36 进制，可输入 0b/0o/0x 前缀。"}
              </span>
              <Button onClick={handleSubmit} disabled={loading}>
                {mode === "base" ? "转换" : actionLabel}
              </Button>
            </div>
          </CardContent>
        </Card>

        {mode === "base" ? (
          <BasePanel result={baseResult} error={error} />
        ) : (
          <OutputPanel
            mode={mode as AiMode}
            input={lastInput || input}
            loading={loading}
            error={error}
            data={data}
          />
        )}
      </main>

      <ApiSettings
        open={showSettings}
        apiKey={apiKey}
        onClose={() => setShowSettings(false)}
        onSave={(value) => {
          setApiKey(value);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, value);
          }
        }}
      />
    </div>
  );
}
