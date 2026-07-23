"use client";

import { useRef, useState, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";

export function OtpInput({
  length = 6,
  onComplete,
  disabled = false,
}: {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;
    const sanitized = value.replace(/\D/g, "");
    if (!sanitized) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    const char = sanitized[sanitized.length - 1];
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = nextDigits.join("");
    if (fullCode.length === length && !nextDigits.includes("")) {
      onComplete(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < length; i++) {
      nextDigits[i] = pasted[i] || "";
    }
    setDigits(nextDigits);

    const targetIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[targetIndex]?.focus();

    if (pasted.length === length) {
      onComplete(pasted);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-12 w-10 rounded-lg border border-mv-border bg-mv-surface text-center font-mono text-[18px] font-bold text-mv-ink shadow-mv-sm transition-all focus:border-mv-green-dark focus:outline-none focus:ring-2 focus:ring-mv-green/30 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
