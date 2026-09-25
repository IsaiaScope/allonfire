import { HTTP_HEADER, type HttpHeader } from "./http";

/** Two years, the HSTS preload list's minimum. */
const HSTS_MAX_AGE_S = 63_072_000;

/**
 * Headers every allonfire app sends. Mutable on purpose: Next's `headers()`
 * config takes a `Header[]`, not a readonly one.
 */
export const SECURITY_HEADERS: { key: HttpHeader; value: string }[] = [
  { key: HTTP_HEADER.X_FRAME_OPTIONS, value: "DENY" },
  { key: HTTP_HEADER.X_CONTENT_TYPE_OPTIONS, value: "nosniff" },
  {
    key: HTTP_HEADER.REFERRER_POLICY,
    value: "strict-origin-when-cross-origin",
  },
  { key: HTTP_HEADER.X_DNS_PREFETCH_CONTROL, value: "on" },
  {
    key: HTTP_HEADER.STRICT_TRANSPORT_SECURITY,
    value: `max-age=${HSTS_MAX_AGE_S}; includeSubDomains`,
  },
];
