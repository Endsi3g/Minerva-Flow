"use client";

import { Sparkles, Zap, Bug, CheckCircle2 } from "lucide-react";

export function formatInlineText(text: string) {
  // Regex to match `code` and **bold**
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      const codeText = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="mx-1 rounded-md bg-mv-ink/5 dark:bg-mv-ink/20 px-1.5 py-0.5 text-[11.5px] font-mono font-medium text-mv-green-dark border border-mv-border/40"
        >
          {codeText}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={idx} className="font-semibold text-mv-ink dark:text-mv-cream">
          {boldText}
        </strong>
      );
    }
    return part;
  });
}

export function ChangelogMarkdownRenderer({
  content,
  category,
}: {
  content: string;
  category?: "fonctionnalite" | "amelioration" | "correctif";
}) {
  if (!content) return null;

  // Split into lines or paragraphs
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);

  const getBulletIcon = () => {
    switch (category) {
      case "fonctionnalite":
        return <Sparkles size={14} className="text-mv-green shrink-0 mt-0.5" />;
      case "amelioration":
        return <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />;
      case "correctif":
        return <Bug size={14} className="text-rose-500 shrink-0 mt-0.5" />;
      default:
        return <CheckCircle2 size={14} className="text-mv-green shrink-0 mt-0.5" />;
    }
  };

  // Check if content has explicit bullet points
  const hasBullets = lines.some((l) => l.startsWith("- ") || l.startsWith("* ") || l.startsWith("• "));

  if (hasBullets) {
    return (
      <div className="space-y-2 text-[13px] leading-relaxed text-mv-ink-soft">
        {lines.map((line, i) => {
          const isBullet = line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ");
          const cleanLine = isBullet ? line.replace(/^[-*•]\s*/, "") : line;

          if (!isBullet) {
            return (
              <p key={i} className="font-medium text-mv-ink">
                {formatInlineText(cleanLine)}
              </p>
            );
          }

          return (
            <div key={i} className="flex items-start gap-2.5">
              {getBulletIcon()}
              <div className="flex-1">{formatInlineText(cleanLine)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // If sentence-based, split by " • " or ". " if bullet points were serialized inline
  if (content.includes(" • ") || content.includes(" - ")) {
    const inlineItems = content.split(/(?=\s[•\-]\s|\s\d\)\s)/g).map((s) => s.trim()).filter(Boolean);

    return (
      <div className="space-y-2 text-[13px] leading-relaxed text-mv-ink-soft">
        {inlineItems.map((item, i) => {
          const cleanItem = item.replace(/^[•\-]\s*/, "");
          return (
            <div key={i} className="flex items-start gap-2.5">
              {getBulletIcon()}
              <div className="flex-1">{formatInlineText(cleanItem)}</div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default paragraph renderer
  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-mv-ink-soft">
      {lines.map((para, idx) => (
        <p key={idx}>{formatInlineText(para)}</p>
      ))}
    </div>
  );
}
