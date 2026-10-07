/**
 * Runtime helpers over plain objects, and their type-level counterparts.
 *
 * `Object.keys`/`values`/`entries` are typed loosely on purpose — a value may
 * always carry more properties than its type declares, so the standard library
 * cannot promise the keys it returns are the ones you declared. For a literal
 * `as const` object that caveat does not apply, and these narrow it back.
 *
 * The type helpers are the same operations one level up: `KeyOf<typeof X>` is
 * what `objectKeys(X)` returns, `ValueOf<typeof X>` what `objectValues(X)`
 * does. Keeping the pair in one file is what makes them stay in step.
 */

/** The keys of `T` — the type `objectKeys` returns. */
export type KeyOf<T> = keyof T & string;

/** The values of `T` — the type `objectValues` returns. */
export type ValueOf<T> = T[keyof T];

/** One `[key, value]` pair of `T` — the element type `objectEntries` returns. */
export type EntryOf<T> = [KeyOf<T>, T[KeyOf<T>]];

/**
 * An element of a readonly tuple.
 *
 * The array counterpart of `ValueOf`: `ElementOf<typeof SIGNALS>` is the union
 * of what a `readonly [...] as const` holds, where `ValueOf` would also pick up
 * `length`, `map` and the rest of the array prototype.
 */
export type ElementOf<T extends readonly unknown[]> = T[number];

export function objectKeys<T extends object>(obj: T): KeyOf<T>[] {
  return Object.keys(obj) as KeyOf<T>[];
}

export function objectValues<T extends object>(obj: T): ValueOf<T>[] {
  return Object.values(obj) as ValueOf<T>[];
}

export function objectEntries<T extends object>(obj: T): EntryOf<T>[] {
  return Object.entries(obj) as EntryOf<T>[];
}

/**
 * The inverse of `objectEntries`, and the one that actually removes a cast.
 *
 * `Object.fromEntries` is declared as returning `{ [k: string]: V }` — it
 * discards the key type entirely, so every call that wants a `Record<Union, V>`
 * ends in `as Record<Union, V>` at the call site. That cast is unchecked: the
 * entries can be missing half the union and it still compiles.
 *
 * Here the cast happens once, behind a signature that infers `K` from the
 * entries. Callers get the record type back without writing an assertion, so a
 * wrong key is a type error where the entries are built.
 *
 * Pass entries as tuples — `.map((k) => [k, f(k)] as const)`. Without `as
 * const` an array literal widens to `(K | V)[]` and `K` cannot be inferred.
 */
export function objectFromEntries<K extends PropertyKey, V>(
  entries: Iterable<readonly [K, V]>
): Record<K, V> {
  return Object.fromEntries(entries) as Record<K, V>;
}
