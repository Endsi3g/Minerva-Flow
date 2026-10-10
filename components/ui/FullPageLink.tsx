"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type FullPageLinkProps = Omit<ComponentProps<"a">, "href"> & { href?: string };

/** OAuth endpoints and recovery links require a document request. Never prefetch them. */
export function FullPageLink({ href, ...props }: FullPageLinkProps) {
  if (!href) return <a {...props} />;
  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onNavigate={(event) => {
        event.preventDefault();
        window.location.assign(new URL(href, window.location.href).href);
      }}
    />
  );
}
