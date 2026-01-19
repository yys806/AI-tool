"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Code, Image, QrCode, Settings, Sigma, Workflow } from "lucide-react";

import { ApiSettings } from "../components/api-settings";
import { BasePanel } from "../components/base-panel";
import { CodePanel, type CodeData } from "../components/code-panel";
import { LatexPanel } from "../components/latex-panel";
import { QrPanel } from "../components/qr-panel";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { OutputPanel } from "../components/output-panel";
import { convertBase, type BaseConversion } from "../lib/base-convert";
import type { QrCornerDotType, QrCornerSquareType, QrDotsType } from "../components/qr-renderer";

type AiMode = "math" | "diagram" | "code" | "latex";

type Mode = AiMode | "base" | "qr";

const STORAGE_KEY = "siliconflow_api_key";
const API_BASE_URL = "https://api.siliconflow.cn/v1";

const MODEL_OPTIONS = [
  { value: "deepseek-ai/DeepSeek-V3.2", label: "DeepSeek V3.2" },
  { value: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
  { value: "Pro/zai-org/GLM-4.7", label: "GLM-4.7 Pro" },
] as const;

const VISION_MODEL_OPTIONS = [
  { value: "Qwen/Qwen-Image", label: "Qwen-Image" },
  { value: "Qwen/Qwen-Image-Edit-2509", label: "Qwen-Image-Edit-2509" },
  { value: "__custom__", label: "自定义模型" },
] as const;

const CODE_STYLE_OPTIONS = [
  { value: "structured", label: "结构化" },
  { value: "concise", label: "精简" },
  { value: "detailed", label: "详细" },
] as const;

type ModelId = (typeof MODEL_OPTIONS)[number]["value"];
type CodeStyleId = (typeof CODE_STYLE_OPTIONS)[number]["value"];

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
  code:
    "你是一名资深软件工程师。请解释用户提供的代码，并生成清晰的伪代码。" +
    "你必须仅返回一个 JSON 对象，包含以下字段：" +
    "explanation: 字符串，说明代码整体逻辑与关键步骤；" +
    "pseudocode: 字符串，结构化伪代码，注意可读性与层次。",
  latex:
    "你是一名公式识别专家。请识别用户上传的公式图片，" +
    "仅返回纯 LaTeX 字符串，不要包含 markdown、代码块或额外解释。",
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

function normalizeLatex(value: string) {
  let text = value.trim();
  if (text.startsWith("$$") && text.endsWith("$$")) {
    text = text.slice(2, -2);
  } else if (text.startsWith("$") && text.endsWith("$")) {
    text = text.slice(1, -1);
  }
  return text.trim();
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("math");
  const [model, setModel] = useState<ModelId>(MODEL_OPTIONS[0].value);
  const [visionModel, setVisionModel] = useState<string>(VISION_MODEL_OPTIONS[0].value);
  const [customVisionModel, setCustomVisionModel] = useState("");
  const [input, setInput] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [data, setData] = useState<MathData | DiagramData | null>(null);
  const [codeResult, setCodeResult] = useState<CodeData | null>(null);
  const [baseResult, setBaseResult] = useState<BaseConversion | null>(null);
  const [baseError, setBaseError] = useState<string | null>(null);
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
  const [codeStyle, setCodeStyle] = useState<CodeStyleId>(CODE_STYLE_OPTIONS[0].value);
  const [latexImage, setLatexImage] = useState<string | null>(null);
  const [latexResult, setLatexResult] = useState("");
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

  useEffect(() => {
    if (!baseSource) return;
    applyBaseConversion(baseSource.value, baseSource.base);
  }, [customBase]);

  const placeholder = useMemo(() => {
    if (mode === "math") {
      return "例如：J(\\theta) = -\\frac{1}{m} \\sum_{i=1}^m y^{(i)} \\log \\hat{y}^{(i)}";
    }
    if (mode === "diagram") {
      return "例如：用户登录，如果 Token 有效则查询 DB，否则返回 401";
    }
    if (mode === "code") {
      return "粘贴需要解释的代码片段，例如 Python/JS/Java 逻辑。";
    }
    return "";
  }, [mode]);

  const actionLabel = useMemo(() => {
    if (mode === "math") return "解码";
    if (mode === "diagram") return "生成图表";
    if (mode === "code") return "解析代码";
    if (mode === "latex") return "识别公式";
    return "生成";
  }, [mode]);

  const helperText = useMemo(() => {
    if (mode === "math") {
      return "支持 LaTeX 公式，推荐使用 \\frac、\\sum 等结构。";
    }
    if (mode === "diagram") {
      return "支持条件、分支与循环的流程描述。";
    }
    if (mode === "code") {
      return "适合短代码段，建议附上语言与上下文。";
    }
    if (mode === "latex") {
      return "建议上传清晰的公式截图，避免背景噪点。";
    }
    if (mode === "base") {
      return "支持 2-36 进制，可输入 0b/0o/0x 前缀，实时更新。";
    }
    return "支持文字与链接，自动实时生成二维码。";
  }, [mode]);

  const handleModeChange = (value: string) => {
    const nextMode = value as Mode;
    setMode(nextMode);
    setError(null);
    setBaseError(null);
    setLoading(false);
    setData(null);
    setCodeResult(null);
    setLatexResult("");
  };

  const applyBaseConversion = (value: string, fromBase: number) => {
    setBaseSource({ base: fromBase, value });

    if (!value.trim()) {
      setBaseResult(null);
      setBaseError(null);
      if (fromBase === customBase) {
        setCustomValue(value);
      } else {
        setBaseInputs((prev) => ({ ...prev, [fromBase]: value }));
      }
      return;
    }

    const mainTarget = fromBase === customBase ? 10 : customBase;
    const mainConversion = convertBase(value, fromBase, mainTarget);

    if (!mainConversion.result || mainConversion.error) {
      setBaseResult(null);
      setBaseError(mainConversion.error || "转换失败，请检查输入。");
      if (fromBase === customBase) {
        setCustomValue(value);
      } else {
        setBaseInputs((prev) => ({ ...prev, [fromBase]: value }));
      }
      return;
    }

    const outputs = new Map<number, string>();
    mainConversion.result.all.forEach((item) => outputs.set(item.base, item.value));

    if (fromBase === customBase && !outputs.has(customBase)) {
      const customConversion = convertBase(value, fromBase, customBase);
      if (customConversion.result) {
        outputs.set(customBase, customConversion.result.output);
      }
    }

    setBaseInputs({
      2: outputs.get(2) ?? "",
      8: outputs.get(8) ?? "",
      10: outputs.get(10) ?? "",
      16: outputs.get(16) ?? "",
    });
    setCustomValue(outputs.get(customBase) ?? "");

    const allBases = [2, 8, 10, 16, customBase].filter(
      (base, index, arr) => arr.indexOf(base) === index
    );

    setBaseResult({
      ...mainConversion.result,
      output: outputs.get(mainTarget) ?? mainConversion.result.output,
      all: allBases.map((base) => ({
        base,
        label: `${base} 进制`,
        value: outputs.get(base) ?? "",
      })),
    });
    setBaseError(null);
  };

  const handleSubmit = async () => {
    if (loading) return;
    setError(null);

    if (mode === "base" || mode === "qr") {
      return;
    }

    const trimmed = input.trim();

    if (mode === "latex") {
      if (!latexImage) {
        setError("请先上传公式截图。");
        return;
      }
      const requestVision =
        visionModel === "__custom__" ? customVisionModel.trim() : visionModel.trim();
      if (!requestVision) {
        setError("请先选择或填写视觉模型 ID。");
        return;
      }
    } else if (!trimmed) {
      setError("请先输入内容。");
      return;
    }

    const normalizedKey = normalizeApiKey(apiKey);
    if (!normalizedKey) {
      setError("请先在设置中填写 API Key。");
      return;
    }

    setLoading(true);
    setData(null);
    setCodeResult(null);
    if (mode === "latex") setLatexResult("");

    try {
      const systemPrompt =
        mode === "code"
          ? `${SYSTEM_PROMPTS.code}\n额外要求：伪代码风格为${
              CODE_STYLE_OPTIONS.find((option) => option.value === codeStyle)?.label ||
              codeStyle
            }。`
          : SYSTEM_PROMPTS[mode];

      const requestModel =
        mode === "latex"
          ? visionModel === "__custom__"
            ? customVisionModel.trim()
            : visionModel.trim()
          : model;

      const messages =
        mode === "latex"
          ? [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "请识别图片中的公式并输出 LaTeX。" },
                  { type: "image_url", image_url: { url: latexImage } },
                ],
              },
            ]
          : [
              { role: "system", content: systemPrompt },
              { role: "user", content: trimmed },
            ];

      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${normalizedKey}`,
        },
        body: JSON.stringify({
          model: requestModel,
          messages,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const detail =
          errorPayload?.error?.message ||
          errorPayload?.error ||
          errorPayload?.message ||
          "请求失败，请检查网络或 API Key。";
        if (response.status === 401) {
          throw new Error("API Key 无效或未授权，请检查后重试。");
        }
        throw new Error(detail);
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };

      const rawContent = payload?.choices?.[0]?.message?.content;
      if (!rawContent) {
        throw new Error("模型未返回内容。");
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
      } else if (mode === "code") {
        const parsed = parseJsonObject(content);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("模型未返回有效 JSON。");
        }

        const parsedData = parsed as Partial<CodeData>;
        setCodeResult({
          explanation: parsedData.explanation || "",
          pseudocode: parsedData.pseudocode || "",
        });
      } else if (mode === "latex") {
        setLatexResult(normalizeLatex(content));
      } else {
        setData({ mermaid: content });
      }

      if (mode !== "latex") {
        setLastInput(trimmed);
      }
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
        <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">Shen's tools</h1>
        <p className="max-w-2xl text-sm text-[color:var(--muted)] sm:text-base">
          集成公式解码、架构绘图、代码解析、图转 LaTeX、进制转换与二维码生成的轻量工具集。
        </p>
      </header>

      <section className="mx-auto mt-8 w-full max-w-6xl animate-fade-up">
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="w-full justify-start gap-2 sm:w-auto">
            <TabsTrigger value="math">
              <Sigma className="h-4 w-4" />
              公式翻译官
            </TabsTrigger>
            <TabsTrigger value="diagram">
              <Workflow className="h-4 w-4" />
              架构图生成器
            </TabsTrigger>
            <TabsTrigger value="code">
              <Code className="h-4 w-4" />
              代码解析
            </TabsTrigger>
            <TabsTrigger value="latex">
              <Image className="h-4 w-4" />
              图转 LaTeX
            </TabsTrigger>
            <TabsTrigger value="base">
              <ArrowLeftRight className="h-4 w-4" />
              进制转换
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrCode className="h-4 w-4" />
              二维码生成器
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
                : mode === "code"
                ? "输入代码"
                : mode === "latex"
                ? "上传公式"
                : mode === "base"
                ? "输入数值"
                : "输入内容"}
            </CardTitle>
            <CardDescription>
              {mode === "math"
                ? "粘贴 LaTeX 公式，我们会返回中文解释与代码实现。"
                : mode === "diagram"
                ? "用自然语言描述流程，我们会生成 Mermaid 流程图。"
                : mode === "code"
                ? "粘贴代码片段，我们会给出解释与伪代码。"
                : mode === "latex"
                ? "上传公式截图，识别并输出 LaTeX。"
                : mode === "base"
                ? "设置输入/输出进制，完成任意进制之间的转换。"
                : "输入任意文字或链接，实时生成可自定义的二维码。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "base" ? (
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
            ) : mode === "qr" ? (
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
            ) : mode === "latex" ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="vision-model"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                  >
                    视觉模型
                  </label>
                  <select
                    id="vision-model"
                    value={visionModel}
                    onChange={(event) => setVisionModel(event.target.value)}
                    disabled={loading}
                    className="glass h-11 w-full rounded-full px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                  >
                    {VISION_MODEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.value})
                      </option>
                    ))}
                  </select>
                  {visionModel === "__custom__" ? (
                    <input
                      type="text"
                      value={customVisionModel}
                      onChange={(event) => setCustomVisionModel(event.target.value)}
                      disabled={loading}
                      placeholder="自定义视觉模型 ID，例如：my-org/my-vision-model"
                      className="glass h-11 w-full rounded-full px-4 text-sm text-[color:var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="latex-image"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                  >
                    上传公式截图
                  </label>
                  <input
                    id="latex-image"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setLatexImage(reader.result as string);
                        setLatexResult("");
                      };
                      reader.readAsDataURL(file);
                      event.currentTarget.value = "";
                    }}
                    className="glass h-12 w-full rounded-2xl px-4 text-sm text-[color:var(--ink)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
                  />
                </div>
                {latexImage ? (
                  <div className="glass flex items-center justify-center rounded-2xl p-4">
                    <img
                      src={latexImage}
                      alt="公式截图预览"
                      className="max-h-48 w-auto rounded-xl object-contain"
                    />
                  </div>
                ) : null}
              </>
            ) : (
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
                {mode === "code" ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="code-style"
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
                    >
                      伪代码风格
                    </label>
                    <select
                      id="code-style"
                      value={codeStyle}
                      onChange={(event) => setCodeStyle(event.target.value as CodeStyleId)}
                      disabled={loading}
                      className="glass h-11 w-full rounded-full px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                    >
                      {CODE_STYLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <Textarea
                  placeholder={placeholder}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className={mode === "code" ? "font-mono" : undefined}
                />
              </>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[color:var(--muted)]">{helperText}</span>
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
          <BasePanel result={baseResult} error={baseError} />
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
        ) : mode === "code" ? (
          <CodePanel data={codeResult} error={error} loading={loading} />
        ) : mode === "latex" ? (
          <LatexPanel image={latexImage} latex={latexResult} error={error} loading={loading} />
        ) : (
          <OutputPanel
            mode={mode === "diagram" ? "diagram" : "math"}
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
