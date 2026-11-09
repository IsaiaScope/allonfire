// @module-tag unit
import { createMailSink } from "../mail-sink";
import { E2E } from "../run";

const KEY = "key-for-the-test";
const MESSAGE = {
  from: "no-reply@sink.test",
  html: "<p>hi</p>",
  subject: "Hi",
  text: "hi",
  to: "someone@sink.test",
};

/** One call to the sink, as a provider's driver makes it. */
const call = async (
  sink: ReturnType<typeof createMailSink>,
  path: string,
  { body, key = KEY }: { body?: unknown; key?: string | null } = {}
) =>
  sink(
    new Request(`https://sink.test${path}`, {
      body: body === undefined ? null : await Response.json(body).text(),
      headers: key === null ? {} : { authorization: `Bearer ${key}` },
      method: body === undefined ? "GET" : "POST",
    })
  );

describe("createMailSink", () => {
  it("accepts a message and lists it by recipient, others' mail apart", async () => {
    const sink = createMailSink(KEY);
    expect(
      (await call(sink, E2E.MAIL_SINK.PATH.SEND, { body: MESSAGE })).ok
    ).toBe(true);
    await call(sink, E2E.MAIL_SINK.PATH.SEND, {
      body: { ...MESSAGE, to: "other@sink.test" },
    });
    const listed = await call(
      sink,
      `${E2E.MAIL_SINK.PATH.SENT}?to=${encodeURIComponent(MESSAGE.to)}`,
      { key: null }
    );
    expect(await listed.json()).toEqual([MESSAGE]);
  });

  it.each([null, "wrong"])(
    "refuses a send with the key %s and keeps nothing",
    async (key) => {
      const sink = createMailSink(KEY);
      const refused = await call(sink, E2E.MAIL_SINK.PATH.SEND, {
        body: MESSAGE,
        key,
      });
      expect(refused.status).toBe(401);
      const listed = await call(sink, E2E.MAIL_SINK.PATH.SENT, { key: null });
      expect(await listed.json()).toEqual([]);
    }
  );

  it("refuses a body that is not a message", async () => {
    const sink = createMailSink(KEY);
    const refused = await call(sink, E2E.MAIL_SINK.PATH.SEND, {
      body: { subject: "no recipient" },
    });
    expect(refused.status).toBe(422);
  });

  it("counts what it accepted since a date, for the usage a provider reports", async () => {
    const sink = createMailSink(KEY);
    await call(sink, E2E.MAIL_SINK.PATH.SEND, { body: MESSAGE });
    await call(sink, E2E.MAIL_SINK.PATH.SEND, { body: MESSAGE });
    const since = (start: Date) =>
      call(
        sink,
        `${E2E.MAIL_SINK.PATH.METRICS}?start_date=${start.toISOString()}`
      );
    expect(await (await since(new Date(0))).json()).toEqual({
      totals: { sent: 2 },
    });
    expect(await (await since(new Date(Date.now() + 60_000))).json()).toEqual({
      totals: { sent: 0 },
    });
  });
});
