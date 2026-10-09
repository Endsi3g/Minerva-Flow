import { cleanup, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FullPageLink } from "@/components/ui/FullPageLink";

const captured = vi.hoisted(() => ({ props: null as ComponentProps<typeof import("next/link").default> | null }));
vi.mock("next/link", () => ({ default: (props: ComponentProps<typeof import("next/link").default>) => {
  captured.props = props;
  return <a href={String(props.href)} className={props.className}>{props.children}</a>;
} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); captured.props = null; });

describe("full document OAuth links", () => {
  it("retains a real href for keyboard and new-tab navigation without prefetch", () => {
    const { getByRole } = render(<FullPageLink href="/api/oauth/clover" className="connect">Connect Clover</FullPageLink>);
    expect(getByRole("link").getAttribute("href")).toBe("/api/oauth/clover");
    expect(captured.props?.prefetch).toBe(false);
  });
  it("cancels SPA navigation and starts a full absolute document request", () => {
    render(<FullPageLink href="/api/oauth/clover?mode=test">Connect</FullPageLink>);
    const assign = vi.fn();
    const preventDefault = vi.fn();
    vi.stubGlobal("window", { location: { href: "https://minervaflow.app/fr/settings", assign } });
    captured.props?.onNavigate?.({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledExactlyOnceWith("https://minervaflow.app/api/oauth/clover?mode=test");
    vi.unstubAllGlobals();
  });
  it("keeps an unavailable provider without any navigation target", () => {
    const { queryByRole, getByText } = render(<FullPageLink aria-disabled="true">Unavailable</FullPageLink>);
    expect(queryByRole("link")).toBeNull();
    expect(getByText("Unavailable").getAttribute("href")).toBeNull();
    expect(captured.props).toBeNull();
  });
});
