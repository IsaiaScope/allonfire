import { z } from "zod";
import { jsonFrom, parseJson, parseJsonWith, stringifyJson } from "../json";

// parseJson never hands back `any`: unknown unless a type is passed.
export const parsed: unknown = parseJson("1");
// @ts-expect-error unknown is not assignable to number without narrowing
export const notNumber: number = parseJson("1");
// A type passed as the generic types the result.
export const typed: { a: number } = parseJson<{ a: number }>('{"a":1}');
// @ts-expect-error the generic says a is a number
export const mistyped: { a: string } = parseJson<{ a: number }>('{"a":1}');

// parseJsonWith is typed by its schema.
export const point: { x: number } = parseJsonWith(
  '{"x":1}',
  z.object({ x: z.number() })
);
// @ts-expect-error the schema says x is a number
export const wrong: { x: string } = parseJsonWith(
  '{"x":1}',
  z.object({ x: z.number() })
);

// Any type whose every part is JSON is accepted, interfaces included.
interface Row {
  id: string;
  nested: { count: number; at: null };
  note?: string;
  tags: readonly string[];
}
declare const row: Row;
stringifyJson(row);
stringifyJson([1, "a", true, null]);
stringifyJson({ a: 1, b: undefined });

// Anything JSON would drop or mangle is a compile error, at any depth.
// @ts-expect-error undefined is not JSON
stringifyJson(undefined);
// @ts-expect-error a Date is not JSON (it carries methods)
stringifyJson(new Date());
// @ts-expect-error a function is not JSON
stringifyJson({ run: () => 1 });
// @ts-expect-error a nested Date is not JSON either
stringifyJson({ at: { when: new Date() } });
// @ts-expect-error undefined in an array becomes null
stringifyJson([1, undefined]);
// @ts-expect-error a bigint throws in JSON.stringify
stringifyJson({ big: 1n });

// The round trip is typed: what stringifyJson wrote, parseJson reads back.
const text = stringifyJson({ a: 1, tags: ["x"] });
export const back: { a: number; tags: string[] } = parseJson(text);
// @ts-expect-error the text was written from { a: number }, not { a: string }
export const wrongBack: { a: string } = parseJson(text);
// JsonText is still a string wherever a string is wanted.
export const asString: string = text;
// A plain string carries no type: unknown, as before.
// @ts-expect-error a plain string parses to unknown
export const plain: { a: number } = parseJson(String(text));

// jsonFrom passes its generic on to the next step.
export const step = jsonFrom<{ a: number }>("not JSON").pipe(
  z.object({ a: z.number() })
);
