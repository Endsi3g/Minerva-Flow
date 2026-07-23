// design-sync preview shim for "next/link" — the real Next.js Link pulls in
// App Router internals (process.env.__NEXT_* checks, router context) that
// don't exist in a standalone bundle rendered outside a Next.js app. Wired
// via cfg.tsconfig paths (see .design-sync/tsconfig.dssync.json) so preview
// renders get a plain <a>; the real app always uses the real next/link.
import * as React from "react";

type ShimLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
};

export default function Link({ href, prefetch, replace, scroll, shallow, children, ...rest }: ShimLinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
