import { PATTERN } from "../../shared/constants/patterns";
import { SEPARATOR } from "../../shared/constants/separators";
import {
  type ElementOf,
  type KeyOf,
  objectKeys,
} from "../../shared/utils/object";
import { SEARCH } from "./constants/search";
import { type DayRange, isIsoDay } from "./utc-day-range";

/** Each field a search names, with the values it may hold. */
export type SearchFields = Record<string, readonly string[]>;

/** A search read back: each field that held an allowed value, the values it
 *  held, each range (ADR 0031) that held a day or two, and the rest as text. */
export type SearchValue<F extends SearchFields, R extends string = never> = {
  [K in keyof F]?: readonly ElementOf<F[K]>[];
} & { [K in R]?: DayRange } & { text: string };

/** `2026-11-26..2026-11-28` or one day, `2026-11-26`: the two days in order, or nothing. */
const readRange = (value: string): DayRange | undefined => {
  const [first = "", second = first, ...more] = value.split(SEPARATOR.RANGE);
  if (more.length || !isIsoDay(first) || !isIsoDay(second)) {
    return undefined;
  }
  return first <= second
    ? { from: first, to: second }
    : { from: second, to: first };
};

/** What a part's name finds, nothing for a part with no name. */
const named = <T>(
  name: string | undefined,
  find: (name: string) => T | undefined
): T | undefined => (name === undefined ? undefined : find(name));

/** A plain word, or one written under the text field. */
const isTextPart = (name: string | undefined): boolean =>
  name === undefined || name.toLowerCase() === SEARCH.TEXT_FIELD;

const writeRange = ({ from, to }: DayRange): string =>
  from === to ? from : `${from}${SEPARATOR.RANGE}${to}`;

/** A part of a search: `role:admin` is a field and its value, `isa` a value alone. */
const splitPart = (part: string): { name?: string; value: string } => {
  const at = part.indexOf(SEPARATOR.FIELD);
  return at > 0
    ? { name: part.slice(0, at), value: part.slice(at + 1) }
    : { value: part };
};

/**
 * A list's filters held in one string of `field:value` pairs, the free words
 * under `SEARCH.TEXT_FIELD` (ADR 0026): `app:laura,back-office role:admin
 * input:isaia`. A field holds one value or several, comma-separated. A
 * plain word reads as text too, so a hand-typed `isaia` still works. Fields and values are read
 * case-insensitively and come back in the spelling and order `fields` gives,
 * each once; a field or value it does not know is dropped, never an error, so
 * a hand-edited address still reads. A field named twice joins its values.
 * A range (`options.ranges`, ADR 0031) holds days, not a choice:
 * `created:2026-11-26..2026-11-28`, one day `created:2026-11-26`; one that is
 * no day is dropped, a backwards one is put in order. Ranges are written after
 * the fields and before the text.
 */
export const searchQuery = <
  const F extends SearchFields,
  const R extends readonly string[] = readonly [],
>(
  fields: F,
  options: { ranges?: R } = {}
) => {
  const names = objectKeys(fields);
  const fieldNamed = (name: string) =>
    names.find((field) => field.toLowerCase() === name.toLowerCase());
  // `R` itself would find a `string`: this keeps the range names' type.
  const rangeNames: readonly R[number][] = options.ranges ?? [];
  const rangeNamed = (name: string) =>
    rangeNames.find((range) => range.toLowerCase() === name.toLowerCase());

  const parse = (raw: string | null | undefined): SearchValue<F, R[number]> => {
    const picked: { [K in keyof F]?: readonly ElementOf<F[K]>[] } = {};
    const dayRanges: { [K in R[number]]?: DayRange } = {};
    // Generic, so the values read are the ones that field's own type allows,
    // kept in the table's order.
    const pick = <K extends KeyOf<F>>(field: K, value: string) => {
      const asked = new Set(
        value
          .toLowerCase()
          .split(SEPARATOR.LIST)
          .concat((picked[field] ?? []).map((held) => held.toLowerCase()))
      );
      const allowed = fields[field]?.filter((candidate) =>
        asked.has(candidate.toLowerCase())
      );
      if (allowed?.length) {
        picked[field] = allowed;
      }
    };
    const words: string[] = [];
    for (const part of (raw ?? "").split(PATTERN.WHITESPACE)) {
      const { name, value } = splitPart(part);
      const field = named(name, fieldNamed);
      const range = named(name, rangeNamed);
      if (field) {
        pick(field, value);
      } else if (range !== undefined) {
        const read = readRange(value);
        if (read) {
          dayRanges[range] = read;
        }
      } else if (isTextPart(name) && value) {
        words.push(value);
      }
    }
    return { ...picked, ...dayRanges, text: words.join(SEPARATOR.WORD) };
  };

  const serialize = (value: SearchValue<F, R[number]>): string =>
    [
      ...names.flatMap((field) => {
        const held = new Set(value[field]);
        const listed = fields[field]?.filter((allowed) => held.has(allowed));
        return listed?.length
          ? [
              `${field}${SEPARATOR.FIELD}${listed
                .map((allowed) => allowed.toLowerCase())
                .join(SEPARATOR.LIST)}`,
            ]
          : [];
      }),
      ...rangeNames.flatMap((range) => {
        const held = value[range];
        return held ? [`${range}${SEPARATOR.FIELD}${writeRange(held)}`] : [];
      }),
      value.text && `${SEARCH.TEXT_FIELD}${SEPARATOR.FIELD}${value.text}`,
    ]
      .filter(Boolean)
      .join(SEPARATOR.WORD);

  return { parse, serialize };
};
