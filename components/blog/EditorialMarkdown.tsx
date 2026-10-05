import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const editorialComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-12 mb-5 font-display text-2xl font-normal tracking-tight text-mv-ink sm:text-3xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-4 font-display text-xl font-normal text-mv-ink sm:text-2xl">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-6 mb-2.5 text-[15px] font-bold text-mv-ink uppercase tracking-wide">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-6 text-[15.5px] leading-[1.8] text-mv-ink-soft sm:text-[16.5px]">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-mv-ink">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-8 rounded-r-2xl border-l-[3px] border-mv-green bg-gradient-to-r from-mv-green-tint/60 to-mv-surface py-4 pr-6 pl-6 font-display text-lg italic leading-relaxed text-mv-ink sm:text-xl">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="mb-6 list-disc space-y-2 pl-6 text-[15.5px] leading-relaxed text-mv-ink-soft">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-6 list-decimal space-y-2 pl-6 text-[15.5px] leading-relaxed text-mv-ink-soft">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  table: ({ children }) => (
    <div className="my-8 overflow-x-auto rounded-2xl border border-mv-border bg-mv-surface shadow-xs">
      <table className="w-full text-left text-[13.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-mv-border bg-mv-cream-soft font-semibold text-mv-ink">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-mv-border-soft">{children}</tbody>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3.5 font-semibold text-mv-ink">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3.5 text-mv-ink-soft">{children}</td>
  ),
  hr: () => <hr className="my-10 border-mv-border-soft" />,
  code: ({ children }) => (
    <code className="rounded-md border border-mv-border bg-mv-cream-soft px-1.5 py-0.5 font-mono text-[13px] font-semibold text-mv-green-dark">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-2xl border border-mv-border bg-mv-ink p-5 font-mono text-[13px] leading-relaxed text-mv-cream-soft shadow-xs">
      {children}
    </pre>
  ),
};

export function EditorialMarkdown({ content }: { content: string }) {
  return (
    <div className="editorial-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={editorialComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
