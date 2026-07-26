# Shen's tools — 八合一 AI 工具集

基于 Next.js 14 (App Router) 的轻量级学术与工程效率工具集，毛玻璃风格 UI，纯前端 BYOK（Bring Your Own Key）模式直连 SiliconFlow API，无需自建后端。

## 功能清单

| 工具 | 说明 | 是否需要 API Key |
| --- | --- | --- |
| 公式翻译官 | 解读 LaTeX 公式：中文解释、符号表、Python/NumPy/PyTorch 代码实现 | 是 |
| 架构图生成器 | 自然语言流程描述转 Mermaid 流程图，可查看/复制 Mermaid 源码 | 是 |
| 代码解析 | 解释代码逻辑并生成伪代码，支持结构化/精简/详细三种风格 | 是 |
| 图转 LaTeX | 上传公式截图，视觉模型识别输出 LaTeX，附 KaTeX 实时预览 | 是 |
| 提示词炼丹炉 | 将简短需求扩写为结构化 Markdown Prompt（Role/Context/Skills/Constraints/Workflow） | 是 |
| 报错显微镜 | 粘贴报错或堆栈，输出原因分析与修复代码片段 | 是 |
| 进制转换 | 2-36 进制实时互转，支持 0b/0o/0x 前缀与自定义进制 | 否（纯本地计算） |
| 二维码生成器 | 实时生成二维码，可自定义点形状、配色、嵌入 Logo 图片 | 否（纯本地计算） |

## BYOK 模式说明

本项目采用 **BYOK（Bring Your Own Key）** 架构：

- 用户在页面右上角「设置」中填写自己的 SiliconFlow API Key；
- Key 仅保存在浏览器 `localStorage`（键名 `siliconflow_api_key`），**不会上传到任何服务器**；
- 所有 AI 请求由浏览器直接发送至 `https://api.siliconflow.cn/v1/chat/completions`，本站点不经手、不记录任何请求内容；
- 项目没有服务端 API 路由，部署产物近似纯静态，不需要在托管平台配置任何密钥类环境变量。

API Key 获取地址：<https://cloud.siliconflow.cn/me/account/ak>

支持的模型：

- 文本：`deepseek-ai/DeepSeek-V3.2`、`deepseek-ai/DeepSeek-V3`、`Pro/zai-org/GLM-4.7`
- 视觉（图转 LaTeX）：`zai-org/GLM-4.6V`、`Qwen/Qwen3-VL-32B-Instruct`

> 注意：BYOK 意味着调用产生的 token 费用计入你自己的 SiliconFlow 账户，请妥善保管 Key，勿在公共设备上留存。

## 本地开发

环境要求：Node.js >= 18.17。

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 生产构建
npm run build

# 本地预览生产构建
npm run start

# 代码检查
npm run lint
```

`.env.example` 仅作为环境变量模板保留；当前 BYOK 模式下本地开发无需配置任何环境变量。

## Netlify 部署

仓库已包含 `netlify.toml`，推送到 GitHub 后由 Netlify 自动构建并上线：

- 构建命令：`npm run build`
- 发布目录：`.next`
- 构建插件：`@netlify/plugin-nextjs`（自动适配 Next.js App Router）
- Node 版本：由 `netlify.toml` 中 `NODE_VERSION` 指定

首次部署步骤：

1. 将仓库推送到 GitHub；
2. 在 Netlify 中 “Add new site → Import an existing project” 选择该仓库；
3. Netlify 会自动读取 `netlify.toml`，无需手动填写构建配置；
4. 无需配置任何环境变量（BYOK 模式，密钥由使用者在前端自行填写）。

之后每次 `git push` 到主分支都会触发自动构建并上线，请在推送前确保 `npm run build` 本地通过。

## 技术栈

- [Next.js 14](https://nextjs.org/)（App Router）+ React 18 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + Radix UI（Slot/Switch/Tabs）+ lucide-react 图标
- [KaTeX](https://katex.org/) / react-katex：公式渲染
- [Mermaid](https://mermaid.js.org/)：流程图渲染
- [qr-code-styling](https://github.com/kozakdenys/qr-code-styling)：二维码生成

## 目录结构

```
app/            页面、全局样式与根布局
components/     各工具面板与 UI 基础组件
components/ui/  Button / Card / Switch / Tabs / Textarea
lib/            进制转换等纯函数工具
types/          第三方库类型补充声明
```
