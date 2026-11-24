// @module-tag unit
import type { Hono } from "hono";
import { type ClientRequestOptions, hc } from "hono/client";
import { HTTP } from "../../../http/constants/http";
import { aofCreateApi } from "../utils/aof-create-api";
import { aofCreateServerApi } from "../utils/aof-create-server-api";

const visitor = vi.hoisted(() => ({
  headers: new Headers({ origin: "https://app.example.test" }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "visitor=1" }),
  headers: async () => visitor.headers,
}));

type Api = Hono<
  object,
  {
    "/ping": {
      $get: {
        input: object;
        output: object;
        outputFormat: "json";
        status: 200;
      };
    };
  }
>;

/** How the App makes its client: its `hc<ApiType>`. */
const create = (url: string, options: ClientRequestOptions) =>
  hc<Api>(url, options);

const BROWSER = {
  local: "http://localhost:3300",
  remote: "https://api.tailnet.test",
};
const SERVER = "http://api:3300";

/** The request the client sent, recorded by a stub `fetch`. */
const sent: Request[] = [];
beforeEach(() => {
  sent.length = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(new Request(input, init));
    return Promise.resolve(Response.json({}));
  });
});
afterEach(() => vi.unstubAllGlobals());

const call = (client: { ping: { $get: () => Promise<Response> } }) =>
  client.ping.$get();

describe("aofCreateApi", () => {
  it("calls the local address from a page on this machine, with credentials", async () => {
    vi.stubGlobal("location", { hostname: "localhost" });
    await call(aofCreateApi({ ...BROWSER, create }));
    expect(sent[0]?.url).toBe(`${BROWSER.local}/ping`);
    expect(sent[0]?.credentials).toBe("include");
  });

  it("calls the remote address from a page opened on any other host", async () => {
    vi.stubGlobal("location", { hostname: "phone.tailnet.test" });
    await call(aofCreateApi({ ...BROWSER, create }));
    expect(sent[0]?.url).toBe(`${BROWSER.remote}/ping`);
  });

  it("calls the one address when there is no remote one (Production)", async () => {
    vi.stubGlobal("location", { hostname: "app.example.test" });
    await call(aofCreateApi({ ...BROWSER, create, remote: undefined }));
    expect(sent[0]?.url).toBe(`${BROWSER.local}/ping`);
  });
});

describe("aofCreateServerApi", () => {
  it("reads the address only when a client is made, not when it is built", () => {
    const address = vi.fn(() => SERVER);
    const { sessionApi } = aofCreateServerApi({ create, url: address });
    expect(address).not.toHaveBeenCalled();
    sessionApi("a=b");
    expect(address).toHaveBeenCalledOnce();
  });

  it("calls the internal address with the Session cookie alone from sessionApi", async () => {
    await call(
      aofCreateServerApi({ create, url: () => SERVER }).sessionApi("a=b")
    );
    expect(sent[0]?.url).toBe(`${SERVER}/ping`);
    expect(sent[0]?.headers.get(HTTP.HEADER.COOKIE)).toBe("a=b");
    expect(sent[0]?.headers.get(HTTP.HEADER.ORIGIN)).toBeNull();
  });

  it("calls the internal address as the visitor from serverApi", async () => {
    await call(
      await aofCreateServerApi({ create, url: () => SERVER }).serverApi()
    );
    expect(sent[0]?.url).toBe(`${SERVER}/ping`);
    expect(sent[0]?.headers.get(HTTP.HEADER.COOKIE)).toBe("visitor=1");
    expect(sent[0]?.headers.get(HTTP.HEADER.ORIGIN)).toBe(
      visitor.headers.get(HTTP.HEADER.ORIGIN)
    );
  });
});
