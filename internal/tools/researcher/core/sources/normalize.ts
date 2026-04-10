export function normalizeCanonicalUrl(input: string): string {
  const candidate = input.trim();

  if (candidate.length === 0) {
    throw new Error("canonicalUrl is required");
  }

  const parsedUrl = new URL(candidate);
  const normalizedPathname =
    parsedUrl.pathname !== "/" && parsedUrl.pathname.endsWith("/")
      ? parsedUrl.pathname.slice(0, -1)
      : parsedUrl.pathname;

  parsedUrl.protocol = parsedUrl.protocol.toLowerCase();
  parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
  parsedUrl.hash = "";
  parsedUrl.pathname = normalizedPathname;

  return parsedUrl.toString();
}
