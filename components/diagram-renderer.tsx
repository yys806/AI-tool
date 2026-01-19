"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

type DiagramRendererProps = {
  code: string;
};

export function DiagramRenderer({ code }: DiagramRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      if (!containerRef.current) return;
      if (!code.trim()) {
        containerRef.current.innerHTML = "";
        setError(null);
        return;
      }

      setError(null);
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "loose",
        themeVariables: {
          primaryColor: "#fdf5ea",
          primaryBorderColor: "#1d7a71",
          primaryTextColor: "#151515",
          lineColor: "#2f5d8a",
        },
      });

      const id = `mermaid-${Math.random().toString(36).slice(2)}`;

      try {
        const { svg } = (await mermaid.render(id, code)) as { svg: string };
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (cancelled) return;
        setError("渲染失败，请检查 Mermaid 语法或简化描述。");
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="space-y-2">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div ref={containerRef} className="glass rounded-2xl p-4" />
    </div>
  );
}
