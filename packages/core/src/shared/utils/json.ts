import { z } from "zod";

/**
 * Typed counterparts of `JSON.parse` and `JSON.stringify`, as `object.ts` is
 * for `Object.keys` and the rest. The standard ones are loose both ways:
 * `parse` returns `any`, so a typo on the result compiles; `stringify` takes
 * anything, so `undefined`, a function or a `Date` compiles and comes out as
 * nothing, or as something the reader does not expect.
 */

type JsonPrimitive = string | number | boolean | null;

/** What `JSON.stringify` drops, throws on, or turns into something else. */
type NotJson =
  | undefined
  | bigint
  | symbol
  | Date
  | Map<unknown, unknown>
  | Set<unknown>
  | ((...args: never[]) => unknown);

/**
 * `T` itself when every part of it is JSON, at any depth; the part that is
 * not becomes `never`, so a value carrying it fails to compile at that part.
 * Generic rather than an index-signature type, so interfaces pass too. An
 * object property may be `undefined`: it is dropped, as `JSON.stringify` does.
 */
export type Json<T> = T extends JsonPrimitive
  ? T
  : T extends NotJson
    ? never
    : T extends readonly unknown[]
      ? { [I in keyof T]: Json<T[I]> }
      : T extends object
        ? { [K in keyof T]: JsonProperty<T[K]> }
        : never;

type JsonProperty<T> = T extends undefined ? undefined : Json<T>;

declare const writtenFrom: unique symbol;

/**
 * A string `stringifyJson` wrote from a `T`. Still a `string` wherever one is
 * wanted; `parseJson` reads the `T` back from it, so the round trip is typed
 * without anyone restating the type.
 */
export type JsonText<T> = string & { readonly [writtenFrom]: T };

/**
 * `JSON.parse`, typed:
 * - text `stringifyJson` wrote: its `T`, inferred;
 * - any other text: `unknown`, or the `T` passed as `parseJson<T>(text)`. That
 *   `T` is a claim, not a check: text from outside goes through
 *   `parseJsonWith`. `NoInfer` keeps the variable the result lands in from
 *   setting `T` on its own.
 */
export function parseJson<T>(text: JsonText<T>): T;
export function parseJson<T = unknown>(text: string): NoInfer<T>;
export function parseJson(text: string): unknown {
  return JSON.parse(text);
}

/** Parses `text` and validates it, typed by `schema`; throws on either failure. */
export const parseJsonWith = <S extends z.ZodType>(
  text: string,
  schema: S
): z.infer<S> => schema.parse(parseJson(text));

/**
 * `JSON.stringify` for JSON values only (`stringifyJson(row)` checks `row`'s
 * type at every depth), returning text that remembers it.
 */
export function stringifyJson<T>(value: T & Json<T>): JsonText<T>;
export function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * A zod step for text that must be JSON: parsed, then handed to `.pipe()`.
 * Text that is not JSON is one issue carrying `message`, not a thrown error.
 * `jsonFrom<T>` types what it hands on; the schema piped after it checks it.
 */
export const jsonFrom = <T = unknown>(message: string) =>
  z.string().transform((text, context) => {
    try {
      return parseJson<T>(text);
    } catch {
      context.addIssue({ code: "custom", message });
      return z.NEVER;
    }
  });
