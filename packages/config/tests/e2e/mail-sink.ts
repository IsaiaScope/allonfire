import { E2E } from "./run";

const HTTP_STATUS = {
  INTERNAL_SERVER_ERROR: 500,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
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

type Via = (typeof E2E.MAIL_SINK.VIA)[keyof typeof E2E.MAIL_SINK.VIA];
type Outcome = "accepted" | "quota" | "refused";

const startsWithLabel = (to: string, label: string) =>
  to.startsWith(`${label}-`);

/** What the sink does with a message to `to`, on the provider `via`. */
const outcomeOf = (to: string, via: Via): Outcome => {
  const { RECIPIENT, VIA } = E2E.MAIL_SINK;
  if (startsWithLabel(to, RECIPIENT.REFUSED)) {
    return "refused";
  }
  if (via === VIA.FIRST && startsWithLabel(to, RECIPIENT.QUOTA)) {
    return "quota";
  }
  return "accepted";
};

const STATUS_OF = {
  accepted: null,
  quota: HTTP_STATUS.TOO_MANY_REQUESTS,
  refused: HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const satisfies Record<Outcome, number | null>;

/**
 * A fake mail provider for an e2e run: takes what a driver sends (the flat
 * shape, `Authorization: Bearer <key>`), keeps it in memory and lists it by
 * recipient on an open `GET /sent?to=`, so a spec reads the email its flow
 * sent. Its metrics answer counts what it accepted, like a provider's usage.
 * The same sink answers as two providers: a path under `SECOND_PREFIX` is the
 * second one. A recipient labelled `QUOTA` or `REFUSED` gets the answer of a
 * provider out of room or refusing, and `GET /attempts?to=` lists every try
 * with its provider and outcome. A Fetch handler, so a test calls it without
 * a server.
 */
export const createMailSink = (key: string) => {
  const received: { at: number; message: Message; via: Via }[] = [];
  const attempts: { outcome: Outcome; to: string; via: Via }[] = [];
  const { ATTEMPTS, METRICS, SEND, SENT } = E2E.MAIL_SINK.PATH;
  const { SECOND_PREFIX, VIA } = E2E.MAIL_SINK;
  const forRecipient = <T extends { to: string }>(
    items: T[],
    to: string | null
  ) => items.filter((item) => to === null || item.to === to);

  const send = async (request: Request, via: Via): Promise<Response> => {
    const message = messageOf(await request.json().catch(() => null));
    if (!message) {
      return new Response(null, { status: HTTP_STATUS.UNPROCESSABLE });
    }
    const outcome = outcomeOf(message.to, via);
    attempts.push({ outcome, to: message.to, via });
    const status = STATUS_OF[outcome];
    if (status !== null) {
      return new Response(null, { status });
    }
    received.push({ at: Date.now(), message, via });
    return Response.json({ id: String(received.length) });
  };

  const usage = (url: URL, via: Via): Response => {
    const start = Date.parse(url.searchParams.get("start_date") ?? "");
    const sent = received.filter(
      ({ at, via: through }) => through === via && at >= start
    ).length;
    return Response.json({ totals: { sent } });
  };

  return (request: Request): Response | Promise<Response> => {
    const url = new URL(request.url);
    const isSecond = url.pathname.startsWith(`${SECOND_PREFIX}/`);
    const via = isSecond ? VIA.SECOND : VIA.FIRST;
    const path = isSecond
      ? url.pathname.slice(SECOND_PREFIX.length)
      : url.pathname;
    const to = url.searchParams.get("to");
    const isGet = request.method === "GET";
    if (isGet && path === SENT) {
      return Response.json(
        forRecipient(
          received.map(({ message }) => message),
          to
        )
      );
    }
    if (isGet && path === ATTEMPTS) {
      return Response.json(
        forRecipient(attempts, to).map(({ outcome, via: through }) => ({
          outcome,
          via: through,
        }))
      );
    }
    if (request.headers.get("authorization") !== `Bearer ${key}`) {
      return new Response(null, { status: HTTP_STATUS.UNAUTHORIZED });
    }
    if (request.method === "POST" && path === SEND) {
      return send(request, via);
    }
    if (isGet && path === METRICS) {
      return usage(url, via);
    }
    return new Response(null, { status: HTTP_STATUS.NOT_FOUND });
  };
};
