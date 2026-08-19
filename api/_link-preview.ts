import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { parse } from "node-html-parser";
import ipaddr from "ipaddr.js";
import type { LinkPreview } from "../src/types/index.js";
import { cloudinaryLinkPreviewImageUrl } from "./_media.js";

const MAX_REDIRECTS = 3;
const MAX_HTML_BYTES = 512 * 1024;
const REQUEST_TIMEOUT_MS = 5_000;

interface HtmlResponse {
  body: string;
  finalUrl: URL;
}

function publicAddress(address: string): boolean {
  const parsed = ipaddr.parse(address);
  const ipv6 = parsed.kind() === "ipv6" ? parsed as ipaddr.IPv6 : null;
  const normalized = ipv6?.isIPv4MappedAddress() ? ipv6.toIPv4Address() : parsed;
  return normalized.range() === "unicast";
}

async function pinnedAddress(hostname: string): Promise<string | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error("Link preview DNS lookup timed out.")),
      REQUEST_TIMEOUT_MS,
    );
  });
  let addresses: LookupAddress[];
  try {
    addresses = await Promise.race([
      lookup(hostname, { all: true, verbatim: true }),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  if (!addresses.length || addresses.some(({ address }) => !publicAddress(address))) {
    return null;
  }
  return addresses[0]?.address ?? null;
}

function normalizedPublicUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null;
    }
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    if (port !== "80" && port !== "443") return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function resolvedPublicUrl(value: string, base: URL): URL | null {
  try {
    return normalizedPublicUrl(new URL(value, base).toString());
  } catch {
    return null;
  }
}

async function requestHtml(url: URL, redirects = 0): Promise<HtmlResponse | null> {
  const address = await pinnedAddress(url.hostname);
  if (!address) return null;
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  const response = await new Promise<{
    body: string;
    headers: Record<string, string | string[] | undefined>;
    statusCode: number;
  }>((resolve, reject) => {
    const pending = request(
      {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "identity",
          Host: url.host,
          "User-Agent": "Kleos link preview/1.0",
        },
        hostname: address,
        method: "GET",
        path: `${url.pathname}${url.search}`,
        port: url.port || undefined,
        servername: url.protocol === "https:" ? url.hostname : undefined,
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        incoming.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_HTML_BYTES) {
            incoming.destroy(new Error("Link preview response is too large."));
            return;
          }
          chunks.push(chunk);
        });
        incoming.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            headers: incoming.headers,
            statusCode: incoming.statusCode ?? 500,
          });
        });
        incoming.on("error", reject);
      },
    );
    pending.setTimeout(REQUEST_TIMEOUT_MS, () => {
      pending.destroy(new Error("Link preview request timed out."));
    });
    pending.on("error", reject);
    pending.end();
  });

  if (response.statusCode >= 300 && response.statusCode < 400) {
    const location = Array.isArray(response.headers.location)
      ? response.headers.location[0]
      : response.headers.location;
    if (!location || redirects >= MAX_REDIRECTS) return null;
    const redirected = resolvedPublicUrl(location, url);
    return redirected ? requestHtml(redirected, redirects + 1) : null;
  }
  const contentType = Array.isArray(response.headers["content-type"])
    ? response.headers["content-type"][0]
    : response.headers["content-type"];
  const contentEncoding = Array.isArray(response.headers["content-encoding"])
    ? response.headers["content-encoding"][0]
    : response.headers["content-encoding"];
  if (
    response.statusCode < 200 ||
    response.statusCode >= 300 ||
    (contentType && !/^(text\/html|application\/xhtml\+xml)\b/i.test(contentType)) ||
    (contentEncoding && contentEncoding !== "identity")
  ) {
    return null;
  }
  return { body: response.body, finalUrl: url };
}

function firstPostUrl(text: string): URL | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (!match) return null;
  let candidate = match;
  while (candidate && /[),.!?;:]$/.test(candidate)) candidate = candidate.slice(0, -1);
  return normalizedPublicUrl(candidate);
}

function content(root: ReturnType<typeof parse>, selector: string): string {
  return root.querySelector(selector)?.getAttribute("content")?.trim() ?? "";
}

function limited(value: string, maximum: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
}

export async function linkPreviewForText(text: string): Promise<LinkPreview | null> {
  const url = firstPostUrl(text);
  if (!url) return null;
  let fetched: HtmlResponse | null;
  try {
    fetched = await requestHtml(url);
  } catch {
    return null;
  }
  if (!fetched) return null;

  const root = parse(fetched.body);
  const title = limited(
    content(root, 'meta[property="og:title"]') || root.querySelector("title")?.text || fetched.finalUrl.hostname,
    300,
  );
  const description = limited(
    content(root, 'meta[property="og:description"]') ||
      content(root, 'meta[name="description"]'),
    500,
  );
  const siteName = limited(content(root, 'meta[property="og:site_name"]'), 100);
  const imageValue = content(root, 'meta[property="og:image:secure_url"]') ||
    content(root, 'meta[property="og:image"]');
  let imageUrl: string | undefined;
  if (imageValue) {
    const candidate = resolvedPublicUrl(imageValue, fetched.finalUrl);
    try {
      if (candidate && await pinnedAddress(candidate.hostname)) {
        imageUrl = cloudinaryLinkPreviewImageUrl(candidate.toString());
      }
    } catch {
      // A preview image failure does not prevent the text post.
    }
  }
  return {
    url: fetched.finalUrl.toString(),
    title,
    description,
    imageUrl,
    siteName: siteName || undefined,
  };
}

export const linkPreviewNetworkRules = { normalizedPublicUrl, publicAddress };
