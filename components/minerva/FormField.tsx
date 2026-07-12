import { Input as ShadcnInput } from "@/components/ui/Input";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { Label as ShadcnLabel } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const fieldBase =
  "h-10 w-full rounded-lg border border-mv-border bg-mv-surface px-3 text-sm text-mv-ink placeholder:text-mv-ink-faint outline-none transition-colors focus-visible:border-mv-green focus-visible:ring-2 focus-visible:ring-mv-green/15";

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <ShadcnInput className={cn(fieldBase, className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <ShadcnTextarea
      className={cn(fieldBase, "min-h-24 py-2.5 leading-relaxed", className)}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        fieldBase,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%23565F52%22><path d=%22M5.5 7.5l4.5 4.5 4.5-4.5%22 stroke=%22%23565F52%22 stroke-width=%221.4%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9",
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <ShadcnLabel
      className={cn("mb-1.5 block text-[12px] font-semibold text-mv-ink-soft", className)}
    >
      {children}
    </ShadcnLabel>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-mv-ink-faint">{hint}</p>}
    </div>
  );
}
