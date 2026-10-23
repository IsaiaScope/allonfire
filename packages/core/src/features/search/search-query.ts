import { PATTERN } from "../../shared/constants/patterns";
import { SEPARATOR } from "../../shared/constants/separators";
import {
  type ElementOf,
  type KeyOf,
  objectKeys,
} from "../../shared/utils/object";
import { SEARCH } from "./constants/search";

/** Each field a search names, with the values it may hold. */
export type SearchFields = Record<string, readonly string[]>;

/** A search read back: each field that held an allowed value, and the rest as text. */
export type SearchValue<F extends SearchFields> = {
  [K in keyof F]?: ElementOf<F[K]>;
} & { text: string };

/** A part of a search: `role:admin` is a field and its value, `isa` a value alone. */
const splitPart = (part: string): { name?: string; value: string } => {
  const at = part.indexOf(SEPARATOR.FIELD);
  return at > 0
    ? { name: part.slice(0, at), value: part.slice(at + 1) }
    : { value: part };
};

/**
 * A list's filters held in one string of `field:value` pairs, the free words
 * under `SEARCH.TEXT_FIELD` (ADR 0026): `app:laura role:admin input:isaia`. A
 * plain word reads as text too, so a hand-typed `isaia` still works. Fields and values are read
 * case-insensitively and come back in the spelling `fields` gives; a field or
 * value it does not know is dropped, never an error, so a hand-edited address
 * still reads. A field named twice keeps its last value.
 */
export const searchQuery = <const F extends SearchFields>(fields: F) => {
  const names = objectKeys(fields);
  const fieldNamed = (name: string) =>
    names.find((field) => field.toLowerCase() === name.toLowerCase());

  const parse = (raw: string | null | undefined): SearchValue<F> => {
    const picked: { [K in keyof F]?: ElementOf<F[K]> } = {};
    // Generic, so the value read is the one that field's own type allows.
    const pick = <K extends KeyOf<F>>(field: K, value: string) => {
      const allowed = fields[field]?.find(
        (candidate) => candidate.toLowerCase() === value.toLowerCase()
      );
      if (allowed !== undefined) {
        picked[field] = allowed;
      }
    };
    const words: string[] = [];
    for (const part of (raw ?? "").split(PATTERN.WHITESPACE)) {
      const { name, value } = splitPart(part);
      const field = name === undefined ? undefined : fieldNamed(name);
      if (field) {
        pick(field, value);
      } else if (
        (name === undefined || name.toLowerCase() === SEARCH.TEXT_FIELD) &&
        value
      ) {
        words.push(value);
      }
    }
    return { ...picked, text: words.join(SEPARATOR.WORD) };
  };

  const serialize = (value: SearchValue<F>): string =>
    [
      ...names.flatMap((field) => {
        const held = value[field];
        return held === undefined
          ? []
          : [`${field}${SEPARATOR.FIELD}${held.toLowerCase()}`];
      }),
      value.text && `${SEARCH.TEXT_FIELD}${SEPARATOR.FIELD}${value.text}`,
    ]
      .filter(Boolean)
      .join(SEPARATOR.WORD);

  return { parse, serialize };
};
