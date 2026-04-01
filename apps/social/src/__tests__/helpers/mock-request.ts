const BASE_URL = "http://localhost:3100";

export function makeRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  return new Request(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

export function withAuth(headers: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${process.env.N8N_API_KEY}`,
    ...headers,
  };
}
