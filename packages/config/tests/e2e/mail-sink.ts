import { E2E } from "./run";

const HTTP_STATUS = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  UNPROCESSABLE: 422,
} as const;

type Message = { to: string } & Record<string, unknown>;

const messageOf = (body: unknown): Message | null => {
  if (typeof body !== "object" || body === null || !("to" in body)) {
    return null;
  }
  const { to } = body;
  return typeof to === "string" ? { ...body, to } : null;
};

/**
 * A fake mail provider for an e2e run: takes what a driver sends (the flat
 * shape, `Authorization: Bearer <key>`), keeps it in memory and lists it by
 * recipient on an open `GET /sent?to=`, so a spec reads the email its flow
 * sent. Its metrics answer counts what it accepted, like a provider's usage.
 * A Fetch handler, so a test calls it without a server.
 */
export const createMailSink = (key: string) => {
  const received: { at: number; message: Message }[] = [];
  const { METRICS, SEND, SENT } = E2E.MAIL_SINK.PATH;

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === SENT) {
      const to = url.searchParams.get("to");
      return Response.json(
        received
          .map(({ message }) => message)
          .filter((message) => to === null || message.to === to)
      );
    }
    if (request.headers.get("authorization") !== `Bearer ${key}`) {
      return new Response(null, { status: HTTP_STATUS.UNAUTHORIZED });
    }
    if (request.method === "POST" && url.pathname === SEND) {
      const message = messageOf(await request.json().catch(() => null));
      if (!message) {
        return new Response(null, { status: HTTP_STATUS.UNPROCESSABLE });
      }
      received.push({ at: Date.now(), message });
      return Response.json({ id: String(received.length) });
    }
    if (request.method === "GET" && url.pathname === METRICS) {
      const start = Date.parse(url.searchParams.get("start_date") ?? "");
      const sent = received.filter(({ at }) => at >= start).length;
      return Response.json({ totals: { sent } });
    }
    return new Response(null, { status: HTTP_STATUS.NOT_FOUND });
  };
};
