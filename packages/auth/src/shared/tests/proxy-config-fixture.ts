import { withSessionRefresh } from "../../features/next/utils/with-session-refresh";

/** A stand-in proxy for `proxyConfig`'s test: what the real wrapper would hide. */
export const handler = () => new Response();
export const wrapped = withSessionRefresh(handler);
export const config = { matcher: "/fixture" };
