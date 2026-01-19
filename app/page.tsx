"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, QrCode, Settings, Sigma, Workflow } from "lucide-react";

import { ApiSettings } from "../components/api-settings";
import { BasePanel } from "../components/base-panel";
import { QrPanel } from "../components/qr-panel";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { OutputPanel } from "../components/output-panel";
import { convertBase, type BaseConversion } from "../lib/base-convert";
import type { QrCornerDotType, QrCornerSquareType, QrDotsType } from "../components/qr-renderer";

type AiMode = "math" | "diagram";
type Mode = AiMode | "base" | "qr";

const STORAGE_KEY = "siliconflow_api_key";

const MODEL_OPTIONS = [
  { value: "deepseek-ai/DeepSeek-V3.2", label: "DeepSeek V3.2" },
  { value: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
  { value: "Pro/zai-org/GLM-4.7", label: "GLM-4.7 Pro" },
] as const;

type ModelId = (typeof MODEL_OPTIONS)[number]["value"];

const BASE_FIELDS = [
  { base: 2, label: "二进制", helper: "示例：101011 或 0b101011" },
  { base: 8, label: "八进制", helper: "示例：755 或 0o755" },
  { base: 10, label: "十进制", helper: "示例：255" },
  { base: 16, label: "十六进制", helper: "示例：FFEE 或 0xFFEE" },
];

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
  const [qrInput, setQrInput] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [data, setData] = useState<MathData | DiagramData | null>(null);
  const [baseResult, setBaseResult] = useState<BaseConversion | null>(null);
  const [baseInputs, setBaseInputs] = useState<Record<number, string>>({
    2: "",
    8: "",
    10: "",
    16: "",
  });
  const [customBase, setCustomBase] = useState(36);
  const [customValue, setCustomValue] = useState("");
  const [baseSource, setBaseSource] = useState<{ base: number; value: string } | null>(
    null
  );
  const [qrSize, setQrSize] = useState(260);
  const [qrMargin, setQrMargin] = useState(8);
  const [qrDotsType, setQrDotsType] = useState<QrDotsType>("rounded");
  const [qrCornersSquareType, setQrCornersSquareType] =
    useState<QrCornerSquareType>("extra-rounded");
  const [qrCornersDotType, setQrCornersDotType] = useState<QrCornerDotType>("dot");
  const [qrDotsColor, setQrDotsColor] = useState("#1d7a71");
  const [qrCornersColor, setQrCornersColor] = useState("#2f5d8a");
  const [qrBackgroundColor, setQrBackgroundColor] = useState("#ffffff");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrImageSize, setQrImageSize] = useState(0.28);
  const [qrImageMargin, setQrImageMargin] = useState(6);
  const [qrHideBackgroundDots, setQrHideBackgroundDots] = useState(true);
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
    if (value !== "math" && value !== "diagram" && value !== "base" && value !== "qr") {
      return;
    }
    setMode(value);
    setInput("");
    setQrInput("");
    setLastInput("");
    setData(null);
    setBaseResult(null);
    setError(null);
    setLoading(false);
  };

  const applyBaseConversion = (value: string, fromBase: number) => {
    const trimmed = value.trim();
    setBaseSource({ base: fromBase, value });

    if (!trimmed) {
      setError(null);
      setBaseResult(null);
      if (fromBase === customBase) {
        setCustomValue(value);
      } else {
        setBaseInputs((prev) => ({ ...prev, [fromBase]: value }));
      }
      return;
    }

    const { result, error: baseError } = convertBase(trimmed, fromBase, customBase);
    if (baseError) {
      setError(baseError);
      setBaseResult(null);
      if (fromBase === customBase) {
        setCustomValue(value);
      } else {
        setBaseInputs((prev) => ({ ...prev, [fromBase]: value }));
      }
      return;
    }

    setError(null);
    setBaseResult(result || null);

    setBaseInputs((prev) => {
      const next = { ...prev };
      for (const field of BASE_FIELDS) {
        const item = result?.all.find((entry) => entry.base === field.base);
        if (item) {
          next[field.base] = field.base === fromBase ? value : item.value;
        }
      }
      return next;
    });

    const customItem = result?.all.find((entry) => entry.base === customBase);
    if (customItem) {
      setCustomValue(fromBase === customBase ? value : customItem.value);
    }
    setLastInput(trimmed);
  };

  useEffect(() => {
    if (!baseSource) return;
    if (baseSource.value.trim()) {
      applyBaseConversion(baseSource.value, baseSource.base);
    }
  }, [customBase]);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("请输入内容后再生成。");
      return;
    }

    if (mode === "base" || mode === "qr") {
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
            Shen's tools
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
          Shen's tools
        </h1>
        <p className="max-w-2xl text-sm text-[color:var(--muted)] sm:text-base">
          集成公式解码、架构绘图与进制转换的轻量工具集，帮助你更快完成学习与开发任务。
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
            <TabsTrigger value="qr">
              <QrCode className="h-4 w-4" />
              📷 二维码生成器
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      <main className="mx-auto mt-6 grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="glass animate-fade-up">
          <CardHeader>
            <CardTitle>
              {mode === "math"
                ? "输入公式"
                : mode === "diagram"
                ? "输入描述"
                : mode === "base"
                ? "输入数值"
                : "输入内容"}
            </CardTitle>
            <CardDescription>
              {mode === "math"
                ? "粘贴 LaTeX 公式，我们会返回中文解释与代码实现。"
                : mode === "diagram"
                ? "用自然语言描述流程，我们会生成 Mermaid 流程图。"
                : mode === "base"
                ? "设置输入/输出进制，完成任意进制之间的转换。"
                : "输入任意文字或链接，实时生成可自定义的二维码。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode !== "base" && mode !== "qr" ? (
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
            ) : mode === "base" ? (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  {BASE_FIELDS.map((field) => (
                    <div key={`base-input-${field.base}`} className="space-y-2">
                      <label
                        htmlFor={`base-${field.base}`}
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                      >
                        {field.label} ({field.base} 进制)
                      </label>
                      <input
                        id={`base-${field.base}`}
                        type="text"
                        value={baseInputs[field.base]}
                        onChange={(event) =>
                          applyBaseConversion(event.target.value, field.base)
                        }
                        placeholder={field.helper}
                        className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                      />
                    </div>
                  ))}
                  <div className="space-y-2">
                    <label
                      htmlFor="custom-base"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      自定义进制
                    </label>
                    <div className="grid gap-2 sm:grid-cols-[140px_1fr]">
                      <input
                        id="custom-base"
                        type="number"
                        min={2}
                        max={36}
                        value={customBase}
                        onChange={(event) => setCustomBase(Number(event.target.value))}
                        className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                      />
                      <input
                        type="text"
                        value={customValue}
                        onChange={(event) =>
                          applyBaseConversion(event.target.value, customBase)
                        }
                        placeholder={`示例：基于 ${customBase} 进制输入`}
                        className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Textarea
                  placeholder="例如：https://example.com 或 任何文字"
                  value={qrInput}
                  onChange={(event) => setQrInput(event.target.value)}
                />
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-size"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      尺寸
                    </label>
                    <input
                      id="qr-size"
                      type="number"
                      min={180}
                      max={600}
                      value={qrSize}
                      onChange={(event) => setQrSize(Number(event.target.value))}
                      className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-margin"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      边距
                    </label>
                    <input
                      id="qr-margin"
                      type="number"
                      min={0}
                      max={24}
                      value={qrMargin}
                      onChange={(event) => setQrMargin(Number(event.target.value))}
                      className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-dots"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      点形状
                    </label>
                    <select
                      id="qr-dots"
                      value={qrDotsType}
                      onChange={(event) => setQrDotsType(event.target.value as QrDotsType)}
                      className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    >
                      <option value="dots">点状</option>
                      <option value="rounded">圆角</option>
                      <option value="classy">艺术</option>
                      <option value="classy-rounded">艺术圆角</option>
                      <option value="square">方形</option>
                      <option value="extra-rounded">超圆角</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-corner"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      框形状
                    </label>
                    <select
                      id="qr-corner"
                      value={qrCornersSquareType}
                      onChange={(event) =>
                        setQrCornersSquareType(
                          event.target.value as QrCornerSquareType
                        )
                      }
                      className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    >
                      <option value="square">方形</option>
                      <option value="dot">圆点</option>
                      <option value="extra-rounded">圆角</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-corner-dot"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      框内点
                    </label>
                    <select
                      id="qr-corner-dot"
                      value={qrCornersDotType}
                      onChange={(event) =>
                        setQrCornersDotType(event.target.value as QrCornerDotType)
                      }
                      className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    >
                      <option value="dot">圆点</option>
                      <option value="square">方块</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-dot-color"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      点颜色
                    </label>
                    <input
                      id="qr-dot-color"
                      type="color"
                      value={qrDotsColor}
                      onChange={(event) => setQrDotsColor(event.target.value)}
                      className="glass h-12 w-full rounded-2xl p-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-corner-color"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      框颜色
                    </label>
                    <input
                      id="qr-corner-color"
                      type="color"
                      value={qrCornersColor}
                      onChange={(event) => setQrCornersColor(event.target.value)}
                      className="glass h-12 w-full rounded-2xl p-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="qr-bg-color"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      背景色
                    </label>
                    <input
                      id="qr-bg-color"
                      type="color"
                      value={qrBackgroundColor}
                      onChange={(event) => setQrBackgroundColor(event.target.value)}
                      className="glass h-12 w-full rounded-2xl p-2"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="qr-image"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      嵌入图片
                    </label>
                    {qrImage ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setQrImage(null)}
                      >
                        移除图片
                      </Button>
                    ) : null}
                  </div>
                  <input
                    id="qr-image"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setQrImage(reader.result as string);
                      reader.readAsDataURL(file);
                      event.currentTarget.value = "";
                    }}
                    className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
                  />
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="qr-image-size"
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                      >
                        图片占比
                      </label>
                      <input
                        id="qr-image-size"
                        type="range"
                        min={0.15}
                        max={0.45}
                        step={0.01}
                        value={qrImageSize}
                        onChange={(event) =>
                          setQrImageSize(Number(event.target.value))
                        }
                        className="w-full accent-[color:var(--accent)]"
                      />
                      <div className="text-xs text-[color:var(--muted)]">
                        当前占比：{Math.round(qrImageSize * 100)}%
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="qr-image-margin"
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                      >
                        图片边距
                      </label>
                      <input
                        id="qr-image-margin"
                        type="number"
                        min={0}
                        max={16}
                        value={qrImageMargin}
                        onChange={(event) =>
                          setQrImageMargin(Number(event.target.value))
                        }
                        className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
                    <input
                      type="checkbox"
                      checked={qrHideBackgroundDots}
                      onChange={(event) => setQrHideBackgroundDots(event.target.checked)}
                      className="h-4 w-4 rounded border border-[var(--border)] text-[color:var(--accent)]"
                    />
                    隐藏图片背景点阵
                  </label>
                </div>
              </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--muted)]">
                {mode === "math"
                  ? "支持 LaTeX 公式，推荐使用 \\frac、\\sum 等结构。"
                  : mode === "diagram"
                  ? "支持条件、分支与循环的流程描述。"
                  : mode === "base"
                  ? "支持 2-36 进制，可输入 0b/0o/0x 前缀，实时更新。"
                  : "支持文字与链接，自动实时生成二维码。"}
              </span>
              {mode === "base" || mode === "qr" ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white/70 px-4 py-2 text-xs font-semibold text-[color:var(--muted)]">
                  {mode === "base" ? "实时转换已开启" : "实时生成已开启"}
                </span>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {actionLabel}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {mode === "base" ? (
          <BasePanel result={baseResult} error={error} />
        ) : mode === "qr" ? (
          <QrPanel
            data={qrInput}
            options={{
              size: qrSize,
              margin: qrMargin,
              dotsType: qrDotsType,
              dotsColor: qrDotsColor,
              cornersSquareType: qrCornersSquareType,
              cornersDotType: qrCornersDotType,
              cornersColor: qrCornersColor,
              backgroundColor: qrBackgroundColor,
              image: qrImage,
              imageSize: qrImageSize,
              imageMargin: qrImageMargin,
              hideBackgroundDots: qrHideBackgroundDots,
            }}
          />
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
