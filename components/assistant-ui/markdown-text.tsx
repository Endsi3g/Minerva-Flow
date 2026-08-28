"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef } from "react";

export function MarkdownText() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children, ...props }: ComponentPropsWithoutRef<"h1">) => (
          <h1 className="font-display text-xl font-bold text-mv-ink mb-2 mt-4 first:mt-0" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }: ComponentPropsWithoutRef<"h2">) => (
          <h2 className="font-display text-lg font-bold text-mv-ink mb-2 mt-3 first:mt-0" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }: ComponentPropsWithoutRef<"h3">) => (
          <h3 className="font-display text-base font-semibold text-mv-ink mb-1.5 mt-2.5 first:mt-0" {...props}>
            {children}
          </h3>
        ),
        p: ({ children, ...props }: ComponentPropsWithoutRef<"p">) => (
          <p className="mb-2 leading-relaxed text-[13.5px] text-mv-ink last:mb-0" {...props}>
            {children}
          </p>
        ),
        ul: ({ children, ...props }: ComponentPropsWithoutRef<"ul">) => (
          <ul className="mb-2.5 ml-4 list-disc space-y-1 text-[13.5px] text-mv-ink" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }: ComponentPropsWithoutRef<"ol">) => (
          <ol className="mb-2.5 ml-4 list-decimal space-y-1 text-[13.5px] text-mv-ink" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }: ComponentPropsWithoutRef<"li">) => (
          <li className="leading-relaxed" {...props}>
            {children}
          </li>
        ),
        strong: ({ children, ...props }: ComponentPropsWithoutRef<"strong">) => (
          <strong className="font-semibold text-mv-ink" {...props}>
            {children}
          </strong>
        ),
        table: ({ children, ...props }: ComponentPropsWithoutRef<"table">) => (
          <div className="my-3 overflow-x-auto rounded-xl border border-mv-border bg-mv-surface shadow-mv-sm">
            <table className="w-full text-left text-xs text-mv-ink border-collapse" {...props}>
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }: ComponentPropsWithoutRef<"thead">) => (
          <thead className="bg-mv-cream-soft border-b border-mv-border text-[11.5px] font-bold uppercase tracking-wider text-mv-ink-soft" {...props}>
            {children}
          </thead>
        ),
        th: ({ children, ...props }: ComponentPropsWithoutRef<"th">) => (
          <th className="px-3.5 py-2.5 font-semibold" {...props}>
            {children}
          </th>
        ),
        td: ({ children, ...props }: ComponentPropsWithoutRef<"td">) => (
          <td className="px-3.5 py-2.5 border-t border-mv-border-soft" {...props}>
            {children}
          </td>
        ),
        code: ({ children, className, ...props }: ComponentPropsWithoutRef<"code">) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="rounded bg-mv-cream-soft px-1.5 py-0.5 font-mono text-[12px] font-medium text-mv-green-dark border border-mv-border-soft" {...props}>
                {children}
              </code>
            );
          }
          return (
            <pre className="my-2.5 overflow-x-auto rounded-xl bg-mv-ink p-3 text-[12px] font-mono text-mv-cream">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          );
        },
      }}
    />
  );
}
