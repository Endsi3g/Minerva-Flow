"use client";

import { ClaudeInputDemo } from "@/components/ui/claude-style-ai-input";
import { MeshDriftBackground } from "@/components/ui/MeshDriftBackground";

export default function ClaudeInputDemoPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4">
      <MeshDriftBackground />
      <ClaudeInputDemo />
    </div>
  );
}
