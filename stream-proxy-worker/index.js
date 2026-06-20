export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    const path = url.pathname.substring(1); // Remove leading slash
    if (!path) {
      return new Response("AniStream Streaming Proxy is running!", {
        headers: { "Content-Type": "text/plain" }
      });
    }

    // Reconstruction of target URL
    const decodedPath = decodeURIComponent(path);
    const targetUrl = "https://" + decodedPath + url.search;

    try {
      // Set up browser-like headers to bypass Cloudflare and referrers on stream CDNs
      const headers = new Headers();
      headers.set("Referer", "https://megaplay.buzz/");
      headers.set("User-Agent", request.headers.get("user-agent") || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");
      headers.set("Accept", request.headers.get("accept") || "*/*");
      headers.set("Accept-Language", request.headers.get("accept-language") || "en-US,en;q=0.9");
      
      // Forward standard Cloudflare bypass headers
      const secChUa = request.headers.get("sec-ch-ua");
      if (secChUa) headers.set("sec-ch-ua", secChUa);
      const secChMobile = request.headers.get("sec-ch-ua-mobile");
      if (secChMobile) headers.set("sec-ch-ua-mobile", secChMobile);
      const secChPlatform = request.headers.get("sec-ch-ua-platform");
      if (secChPlatform) headers.set("sec-ch-ua-platform", secChPlatform);

      const xRequestedWith = request.headers.get("x-requested-with");
      if (xRequestedWith) headers.set("x-requested-with", xRequestedWith);

      headers.set("sec-fetch-dest", "empty");
      headers.set("sec-fetch-mode", "cors");
      headers.set("sec-fetch-site", "cross-site");

      const response = await fetch(targetUrl, { headers });

      // Create new headers to allow CORS
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      responseHeaders.set("Access-Control-Allow-Headers", "*");
      
      // If it's a playlist (.m3u8), we need to read it as text, rewrite all absolute segment links
      // to route back through this worker proxy, and return it.
      if (targetUrl.includes(".m3u8")) {
        let text = await response.text();
        
        // Generically rewrite any absolute https:// domain inside the playlist to go through this worker
        const workerHost = url.origin;
        text = text.replace(/https:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s"']*)/g, (m, domain, path) => {
          return `${workerHost}/${domain}${path}`;
        });

        return new Response(text, {
          status: response.status,
          headers: responseHeaders
        });
      }

      // For segment bytes (.ts / .m4s) or subtitle files, return the raw stream body
      return new Response(response.body, {
        status: response.status,
        headers: responseHeaders
      });

    } catch (err) {
      return new Response("Proxy error: " + err.message, {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/plain"
        }
      });
    }
  }
};
