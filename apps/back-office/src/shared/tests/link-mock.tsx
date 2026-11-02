import type { ReactNode } from "react";

/**
 * The App's `Link` (`@/features/i18n/navigation`) as a test renders it: a
 * plain `<a>`. `prefetch` is Next's, not an `<a>` attribute, so it shows as
 * `data-prefetch` (set when given) for a test to read.
 */
export const LinkMock = ({
  children,
  prefetch,
  ...props
}: {
  children: ReactNode;
  href: string;
  prefetch?: boolean | null;
}) => (
  <a
    data-prefetch={prefetch === undefined ? undefined : String(prefetch)}
    {...props}
  >
    {children}
  </a>
);
