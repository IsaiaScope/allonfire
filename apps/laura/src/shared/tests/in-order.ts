/** Runs `run` on each item, one after the other (a step that needs the last one's effect). */
export const inOrder = <T>(
  items: readonly T[],
  run: (item: T) => Promise<unknown>
) =>
  items.reduce<Promise<unknown>>(
    (chain, item) => chain.then(() => run(item)),
    Promise.resolve()
  );
