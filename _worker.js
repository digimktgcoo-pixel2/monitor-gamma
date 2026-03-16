/**
 * _worker.js — Cloudflare Worker CORS Proxy
 * See DEPLOYMENT.md for setup instructions.
 */
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" }
      });
    }
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/radnet\/([A-Z]{2})\/(.+)$/i);
    if (!match) return new Response("Not found", { status: 404 });
    const [, state, city] = match;
    const year = new Date().getFullYear();
    const epaUrl = `https://radnet.epa.gov/cdx-radnet-rest/api/rest/csv/${year}/fixed/${state.toUpperCase()}/${encodeURIComponent(city.toUpperCase())}`;
    try {
      const res = await fetch(epaUrl, {
        headers: { "User-Agent": "RadMonitor/1.0 (contact: your@email.com)" },
        cf: { cacheTtl: 3600, cacheEverything: true }
      });
      const body = await res.text();
      return new Response(body, {
        status: res.status,
        headers: { "Content-Type": "text/csv", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" }
      });
    } catch (err) {
      return new Response(`Error: ${err.message}`, { status: 502, headers: { "Access-Control-Allow-Origin": "*" } });
    }
  }
};
