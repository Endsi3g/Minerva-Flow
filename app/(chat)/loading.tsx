import { Loader2 } from "lucide-react";

export default function ChatLoading() {
  return (
    <div className="flex h-[75vh] w-full flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-mv-green-dark" />
      <p className="text-[13px] font-medium text-mv-ink-soft animate-pulse">
        Chargement de l'assistant...
      </p>
    </div>
  );
}
