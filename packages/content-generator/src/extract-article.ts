import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export type ArticleContent = {
  text: string;
  excerpt: string | null;
  byline: string | null;
  siteName: string | null;
};

const SKIP_DOMAINS = new Set([
  "github.com",
  "youtube.com",
  "twitter.com",
  "x.com",
  "reddit.com",
  "i.redd.it",
  "v.redd.it",
]);

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_TEXT_CHARS = 4000;
const WWW_PREFIX = /^www\./;

function shouldSkip(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(WWW_PREFIX, "");
    return SKIP_DOMAINS.has(hostname);
  } catch {
    return true;
  }
}

export async function extractArticle(
  url: string,
  timeoutMs = 8000
): Promise<ArticleContent | null> {
  if (shouldSkip(url)) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AllOnFire/1.0; +https://allonfire.com)",
        Accept: "text/html",
      },
    });

    clearTimeout(timer);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    const html = await response.text();
    if (html.length > MAX_BODY_BYTES) {
      return null;
    }

    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article?.textContent) {
      return null;
    }

    return {
      text: article.textContent.trim().slice(0, MAX_TEXT_CHARS),
      excerpt: article.excerpt ?? null,
      byline: article.byline ?? null,
      siteName: article.siteName ?? null,
    };
  } catch {
    return null;
  }
}
