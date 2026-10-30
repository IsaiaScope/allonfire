import type { App } from "@allonfire/database/enums";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import type { ImageBody } from "../constants/schemas";

/** A field as JSON carries it: a Date travels as its ISO string. */
type Wire<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };

test("the wire Image is the stored one, picked and serialised, plus its links", () => {
  // `Pick` fails on a body field the record lacks; the equality on a type
  // that drifted (an id turned number, an alt missing a language).
  expectTypeOf<Omit<ImageBody, "srcSet">>().toEqualTypeOf<
    Wire<Pick<ImageRecord, Exclude<keyof ImageBody, "srcSet">>>
  >();
  expectTypeOf<ImageBody["srcSet"]>().toEqualTypeOf<
    { url: string; width: number }[]
  >();
});

test("an Image's Apps travel as the access rules read them", () => {
  expectTypeOf<ImageBody["apps"][number]>().toEqualTypeOf<App>();
});
