import { objectEntries } from "@allonfire/utils";

const DEFAULT_TIMEOUT = 30_000;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

type RequestOptions = {
  timeout?: number;
  signal?: AbortSignal;
};

async function get<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: RequestOptions
): Promise<T> {
  const url = new URL(endpoint, window.location.origin);

  if (params) {
    for (const [key, value] of objectEntries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const signal = options?.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;

  try {
    const res = await fetch(url, { signal });

    if (!res.ok) {
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }

      const message =
        (body as { error?: string })?.error ?? `Request failed (${res.status})`;
      throw new ApiError(res.status, message, body);
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "Request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = { get } as const;
