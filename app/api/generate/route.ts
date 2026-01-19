import { NextResponse } from "next/server";

export const runtime = "nodejs";

type GenerateMode = "math" | "diagram";

type GenerateRequest = {
  mode?: GenerateMode;
  input?: string;
  model?: string;
  useMock?: boolean;
};

const SYSTEM_PROMPTS: Record<GenerateMode, string> = {
  math:
    "你是一名数学和编程专家。请解码用户提供的 LaTeX 公式。你必须仅返回一个原始的 JSON 对象，包含以下三个字段：" +
    "1. explanation: 一段用中文通俗解释该公式数学含义的文字。" +
    "2. symbols: 一个数组，解释公式中关键符号的含义 (例如 [{ symbol: \"m\", meaning: \"样本数量\" }])。" +
    "3. code: 对应公式计算逻辑的 Python/NumPy/PyTorch 代码字符串。",
  diagram:
    "你是一名系统架构师。请将用户的描述转化为 Mermaid.js 的 flowchart 代码。仅返回代码块内容，" +
    "以 graph TD 或适当的类型开头。不要包含 markdown 格式标记。",
};

const TEXT_MODELS = [
  "deepseek-ai/DeepSeek-V3.2",
  "deepseek-ai/DeepSeek-V3",
  "Pro/zai-org/GLM-4.7",
];

const DEFAULT_TEXT_MODEL =
  process.env.SILICONFLOW_TEXT_MODEL || "deepseek-ai/DeepSeek-V3.2";
const SILICONFLOW_BASE_URL =
  process.env.SILICONFLOW_BASE_URL || "https://api.siliconflow.cn/v1";
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;

const MOCK_MATH_RESPONSE = {
  explanation:
    "这是一个典型的对数似然损失的形式，用于度量模型预测与真实标签之间的偏差，" +
    "对所有样本取平均后作为优化目标。",
  symbols: [
    { symbol: "J(\\theta)", meaning: "损失函数" },
    { symbol: "m", meaning: "样本数量" },
    { symbol: "y", meaning: "真实标签" },
    { symbol: "\\hat{y}", meaning: "模型预测" },
  ],
  code:
    "import torch\n\n" +
    "def loss_fn(y_hat, y):\n" +
    "    eps = 1e-9\n" +
    "    return -(y * torch.log(y_hat + eps) + (1 - y) * torch.log(1 - y_hat + eps)).mean()\n",
};

const MOCK_DIAGRAM_RESPONSE = {
  mermaid:
    "graph TD\n" +
    "  A[User Login] --> B{Token Valid?}\n" +
    "  B -- Yes --> C[Query DB]\n" +
    "  B -- No --> D[Return 401]\n" +
    "  C --> E[Return Result]\n",
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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequest;
    const { mode, input, model, useMock } = body || {};

    if (!mode || typeof input !== "string") {
      return NextResponse.json(
        { error: "Invalid request: mode and input are required." },
        { status: 400 }
      );
    }

    const selectedModel = (model || DEFAULT_TEXT_MODEL).trim();

    if (!TEXT_MODELS.includes(selectedModel)) {
      return NextResponse.json(
        {
          error:
            "Invalid model. Use one of: deepseek-ai/DeepSeek-V3.2, deepseek-ai/DeepSeek-V3, Pro/zai-org/GLM-4.7.",
        },
        { status: 400 }
      );
    }

    if (useMock) {
      return NextResponse.json({
        mode,
        input,
        systemPrompt: SYSTEM_PROMPTS[mode],
        data: mode === "math" ? MOCK_MATH_RESPONSE : MOCK_DIAGRAM_RESPONSE,
      });
    }

    if (!SILICONFLOW_API_KEY) {
      return NextResponse.json(
        { error: "Missing SILICONFLOW_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPTS[mode] },
          { role: "user", content: input },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return NextResponse.json(
        {
          error:
            errorPayload?.error?.message ||
            errorPayload?.error ||
            "Upstream request failed.",
        },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const rawContent = payload?.choices?.[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 }
      );
    }

    const content = stripCodeFences(rawContent);

    if (mode === "math") {
      const parsed = parseJsonObject(content);
      if (!parsed || typeof parsed !== "object") {
        return NextResponse.json(
          { error: "Model did not return valid JSON." },
          { status: 502 }
        );
      }

      const data = parsed as {
        explanation?: string;
        symbols?: { symbol: string; meaning: string }[];
        code?: string;
      };

      return NextResponse.json({
        mode,
        input,
        systemPrompt: SYSTEM_PROMPTS.math,
        data: {
          explanation: data.explanation || "",
          symbols: Array.isArray(data.symbols) ? data.symbols : [],
          code: data.code || "",
        },
      });
    }

    return NextResponse.json({
      mode,
      input,
      systemPrompt: SYSTEM_PROMPTS.diagram,
      data: {
        mermaid: content,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }
}
