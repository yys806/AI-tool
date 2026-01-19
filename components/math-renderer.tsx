"use client";

import { BlockMath } from "react-katex";

import { CopyButton } from "./copy-button";

type SymbolItem = {
  symbol: string;
  meaning: string;
};

type MathRendererProps = {
  latex: string;
  explanation: string;
  symbols: SymbolItem[];
  code: string;
};

export function MathRenderer({ latex, explanation, symbols, code }: MathRendererProps) {
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <BlockMath math={latex} />
      </div>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-[color:var(--muted)]">Í¨Ë×½âÊÍ</h4>
        <div className="glass rounded-2xl p-3">
          <p className="text-sm leading-relaxed text-[color:var(--ink)]">{explanation}</p>
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-sm font-semibold text-[color:var(--muted)]">·ûºÅ¶ÔÕÕ</h4>
        <div className="grid gap-2 md:grid-cols-2">
          {symbols.map((item) => (
            <div key={`${item.symbol}-${item.meaning}`} className="glass rounded-2xl p-3 text-sm">
              <div className="font-semibold">{item.symbol}</div>
              <div className="text-[color:var(--muted)]">{item.meaning}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[color:var(--muted)]">Python/PyTorch</h4>
          <CopyButton value={code} />
        </div>
        <div className="glass rounded-2xl p-3">
          <pre className="overflow-x-auto rounded-xl bg-[#101827] p-4 text-xs text-white">
            <code>{code}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}
