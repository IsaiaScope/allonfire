export function parseErrorMessage(raw: string): string {
  // Some SDKs prefix error.message with the HTTP status code, e.g. "401 {...}"
  const jsonStart = raw.indexOf("{");
  const candidates = jsonStart > 0 ? [raw.slice(jsonStart), raw] : [raw];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const msg = parsed?.error?.message ?? parsed?.message ?? raw;
      const code =
        parsed?.error?.code ?? parsed?.error?.status ?? parsed?.error?.type;
      return code ? `${msg} (${code})` : msg;
    } catch {
      // not valid JSON, try next candidate
    }
  }

  return raw;
}
