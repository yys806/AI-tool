"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "./ui/button";

type ApiSettingsProps = {
  open: boolean;
  apiKey: string;
  onSave: (value: string) => void;
  onClose: () => void;
};

const API_KEY_LINK = "https://cloud.siliconflow.cn/me/account/ak";

export function ApiSettings({ open, apiKey, onSave, onClose }: ApiSettingsProps) {
  const [draft, setDraft] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(apiKey);
    }
  }, [apiKey, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="glass relative z-10 w-full max-w-lg rounded-3xl p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">API Key 设置</h3>
          <p className="text-sm text-[color:var(--muted)]">
            Key 仅保存在浏览器本地存储，前端直接调用 SiliconFlow 接口。
          </p>
        </div>

        <div className="mt-5 space-y-3">
          <label
            htmlFor="siliconflow-key"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
          >
            SiliconFlow API Key
          </label>
          <div className="flex items-center gap-2">
            <input
              id="siliconflow-key"
              type={showKey ? "text" : "password"}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="glass h-11 w-full rounded-full px-4 text-sm text-[color:var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              placeholder="请输入你的 API Key"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowKey((prev) => !prev)}
              className="rounded-full"
              aria-label={showKey ? "隐藏 Key" : "显示 Key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <a
            href={API_KEY_LINK}
            target="_blank"
            rel="noreferrer"
            className="inline-flex text-xs font-medium text-[color:var(--accent)] underline-offset-4 hover:underline"
          >
            获取 SiliconFlow API Key
          </a>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(draft.trim());
              onClose();
            }}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
