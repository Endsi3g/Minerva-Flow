import * as React from "react";
import { Button } from "minerva-flow";
import { Plus, ChevronRight, Loader2, Trash2 } from "lucide-react";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="lime">Lime</Button>
      <Button variant="link">Link</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}

export function WithIcon() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary">
        <Plus data-icon="inline-start" />
        New order
      </Button>
      <Button variant="outline">
        View menu
        <ChevronRight data-icon="inline-end" />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Delete">
        <Trash2 />
      </Button>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" disabled>
        <Loader2 className="animate-spin" data-icon="inline-start" />
        Saving…
      </Button>
      <Button variant="secondary" disabled>
        Disabled
      </Button>
    </div>
  );
}
