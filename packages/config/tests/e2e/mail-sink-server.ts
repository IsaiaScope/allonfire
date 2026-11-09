// Serves the fake mail provider (mail-sink.ts) over https for an e2e run:
//   tsx mail-sink-server.ts
// A provider's URL must be https, so it makes a throwaway certificate with
// `openssl` first (macOS, Linux and CI have it); the API trusts it through
// `NODE_EXTRA_CA_CERTS`, set where the e2e config starts it.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { createServer } from "node:https";
import { dirname } from "node:path";
import { LOCAL } from "../../local/addresses";
import { createMailSink } from "./mail-sink";
import { E2E } from "./run";

const CERT_DAYS = "2";

mkdirSync(dirname(E2E.MAIL_SINK.CERT), { recursive: true });
execFileSync(
  "openssl",
  [
    ...["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", CERT_DAYS],
    ...["-keyout", E2E.MAIL_SINK.CERT_KEY, "-out", E2E.MAIL_SINK.CERT],
    ...["-subj", "/CN=localhost"],
    ...["-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1"],
  ],
  { stdio: "ignore" }
);

const sink = createMailSink(E2E.MAIL_SINK.KEY);

const textOf = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
};

const server = createServer(
  {
    cert: readFileSync(E2E.MAIL_SINK.CERT),
    key: readFileSync(E2E.MAIL_SINK.CERT_KEY),
  },
  async (request, response) => {
    const headers = new Headers();
    if (request.headers.authorization) {
      headers.set("authorization", request.headers.authorization);
    }
    const hasBody = request.method === "POST";
    const answer = await sink(
      new Request(`${LOCAL.URL.MAIL_SINK_E2E}${request.url}`, {
        body: hasBody ? await textOf(request) : null,
        headers,
        method: request.method ?? "GET",
      })
    );
    response.writeHead(answer.status, {
      "content-type": answer.headers.get("content-type") ?? "text/plain",
    });
    response.end(Buffer.from(await answer.arrayBuffer()));
  }
);

server.listen(LOCAL.PORT.MAIL_SINK_E2E);
