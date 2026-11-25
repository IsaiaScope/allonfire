/**
 * Stands in for core's `AOFHydratedBoundary` in a node test: it reads the
 * page's hydration (so the test sees it was asked) and draws its children in
 * a mark that tells whether `onlyMissing` was set.
 */
export const AOFHydratedBoundary = ({
  children,
  hydration: read,
  onlyMissing,
}: {
  children: React.ReactNode;
  hydration: () => unknown;
  onlyMissing?: boolean;
}) => {
  read();
  return <div data-only-missing={onlyMissing}>{children}</div>;
};
