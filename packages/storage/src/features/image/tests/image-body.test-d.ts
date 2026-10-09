import type { ImageLink } from "@allonfire/database/features/auth/access/access";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import type { ImageBody } from "../constants/schemas";

/** A field as JSON carries it: a Date travels as its ISO string. */
type Wire<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };

test("the wire Image is the stored one, picked and serialised", () => {
  // `Pick` fails on a body field the record lacks; the equality on a type
  // that drifted (an id turned number, an alt missing a language).
  expectTypeOf<ImageBody>().toEqualTypeOf<
    Wire<Pick<ImageRecord, keyof ImageBody>>
  >();
});

test("a placement travels as the access rules read it", () => {
  expectTypeOf<ImageBody["apps"][number]>().toEqualTypeOf<ImageLink>();
});
