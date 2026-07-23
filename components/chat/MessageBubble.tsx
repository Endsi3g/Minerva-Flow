import { cn } from "@/lib/utils";
import { Bot, FileText, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import type { ChatAttachment } from "@/lib/types";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
} from "@/components/ui/attachment";
import { useState } from "react";
import { toast } from "sonner";

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-mv-ink">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-mv-green-dark underline">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  code: ({ children }) => (
    <code className="rounded bg-mv-ink/[0.06] px-1 py-0.5 font-mono text-[12px]">{children}</code>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto rounded-lg border border-mv-border-soft">
      <table className="w-full text-[12.5px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-mv-border-soft bg-mv-cream-soft px-2 py-1.5 text-left font-semibold text-mv-ink-faint">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border-b border-mv-border-soft px-2 py-1.5">{children}</td>,
};

function AttachmentChip({ attachment }: { attachment: ChatAttachment }) {
  return (
    <Attachment size="sm">
      <AttachmentMedia>
        <FileText />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{attachment.fileName}</AttachmentTitle>
        <AttachmentDescription>{attachment.mimeType}</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Réponse copiée dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copier la réponse"
      className="mt-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-mv-ink-faint transition-colors hover:bg-mv-ink/5 hover:text-mv-ink"
    >
      {copied ? <Check size={12} className="text-mv-green-dark" /> : <Copy size={12} />}
      <span>{copied ? "Copié !" : "Copier"}</span>
    </button>
  );
}

export function MessageBubble({
  role,
  text,
  attachments,
}: {
  role: "user" | "assistant";
  text: string;
  attachments?: ChatAttachment[];
}) {
  const align = role === "user" ? "end" : "start";

  return (
    <Message align={align}>
      {role === "assistant" && (
        <MessageAvatar>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mv-cream-soft border border-mv-border text-mv-green-dark shadow-mv-sm">
            <Bot size={14} />
          </div>
        </MessageAvatar>
      )}
      <MessageContent>
        <Bubble align={align} variant="ghost">
          <BubbleContent
            className={cn(
              "mv-scale-in rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed border border-mv-border-soft",
              role === "user" ? "bg-mv-green text-mv-cream-soft border-mv-green-dark" : "bg-mv-surface text-mv-ink shadow-mv-sm"
            )}
          >
            {role === "assistant" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {text}
              </ReactMarkdown>
            ) : (
              <span className="whitespace-pre-wrap">{text}</span>
            )}
          </BubbleContent>
        </Bubble>
        {role === "assistant" && text && <CopyButton text={text} />}
        {attachments && attachments.length > 0 && (
          <AttachmentGroup className={cn(role === "user" && "justify-end")}>
            {attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} />
            ))}
          </AttachmentGroup>
        )}
      </MessageContent>
    </Message>
  );
}
