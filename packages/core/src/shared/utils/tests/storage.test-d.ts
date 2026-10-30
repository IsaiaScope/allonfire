import { z } from "zod";
import { storageItem } from "../storage";

const item = storageItem("aof:test", z.object({ at: z.number() }));

// A read is typed by the schema, and may find nothing.
export const read: { at: number } | null = item.read();
// @ts-expect-error null is not assignable without narrowing
export const notNull: { at: number } = item.read();

item.write({ at: 1 });
// @ts-expect-error a write takes the schema's type only
item.write({ at: "1" });
// @ts-expect-error a Date is not JSON
storageItem("aof:when", z.date()).write(new Date());
