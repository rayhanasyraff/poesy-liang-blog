/* Temporary shim to avoid Node's url.parse deprecation warning.
   Some dependencies still call url.parse() which triggers DEP0169. This file
   replaces url.parse with a wrapper that uses the WHATWG URL API when possible
   to avoid the deprecated code path. Remove once all deps are updated.
*/

// Keep minimal, defensive implementation.
try {
  // Use require to ensure this runs in Node runtime. In ESM contexts, importing 'url' works too.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const url = require("url");
  if (url && typeof url.parse === "function") {
    const originalParse = url.parse.bind(url);

    url.parse = function (input: string, parseQueryString?: boolean, slashesDenoteHost?: boolean) {
      try {
        if (!input) {
          // fallback to original behavior for empty input
          return originalParse(input, parseQueryString, slashesDenoteHost);
        }

        // Try to construct WHATWG URL. If it fails, fallback.
        const base = typeof slashesDenoteHost === "string" ? slashesDenoteHost : undefined;
        const u = new URL(input, base || undefined);

        // Return a legacy-looking object used by older code. Not exhaustive.
        return {
          href: u.href,
          protocol: u.protocol,
          auth: u.username || u.password ? `${u.username}:${u.password}` : null,
          host: u.host,
          port: u.port,
          hostname: u.hostname,
          hash: u.hash,
          search: u.search,
          query: parseQueryString ? Object.fromEntries(u.searchParams.entries()) : u.search.replace(/^\?/, ""),
          pathname: u.pathname,
          path: u.pathname + u.search
        };
      } catch (e) {
        // If anything goes wrong, call original parse so behavior remains unchanged.
        return originalParse(input, parseQueryString, slashesDenoteHost);
      }
    };
  }
} catch (e) {
  // If require or patching fails, silently ignore. This shim is best-effort only.
}
