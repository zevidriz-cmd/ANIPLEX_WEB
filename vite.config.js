import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Readable } from 'node:stream'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'stream-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/stream-proxy/')) {
            try {
              // Extract the target URL from path
              const proxyPath = req.url.substring('/stream-proxy/'.length);
              const decodedPath = decodeURIComponent(proxyPath);
              const targetUrl = 'https://' + decodedPath;

              // Setup browser-like headers to bypass Cloudflare protections on stream servers
              const headers = {
                'Referer': 'https://megaplay.buzz/',
                'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'accept': req.headers['accept'] || '*/*',
                'accept-language': req.headers['accept-language'] || 'en-US,en;q=0.9',
              };

              // Forward sec-ch-ua headers if present in original request
              if (req.headers['sec-ch-ua']) headers['sec-ch-ua'] = req.headers['sec-ch-ua'];
              if (req.headers['sec-ch-ua-mobile']) headers['sec-ch-ua-mobile'] = req.headers['sec-ch-ua-mobile'];
              if (req.headers['sec-ch-ua-platform']) headers['sec-ch-ua-platform'] = req.headers['sec-ch-ua-platform'];
              
              // Standard Cloudflare bypass security context
              headers['sec-fetch-dest'] = 'empty';
              headers['sec-fetch-mode'] = 'cors';
              headers['sec-fetch-site'] = 'cross-site';

              const response = await fetch(targetUrl, { headers });

              // Set status and CORS headers
              res.statusCode = response.status;
              const contentType = response.headers.get('content-type');
              if (contentType) {
                res.setHeader('content-type', contentType);
              }
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', '*');

              if (targetUrl.includes('.m3u8')) {
                // If it is a playlist, read it as text, rewrite all absolute links, and send
                let text = await response.text();
                
                // Generically rewrite any absolute https:// domain inside the playlist (excluding localhost) to go through the proxy
                text = text.replace(/https:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^\s"']*)/g, (m, domain, path) => {
                  if (domain.includes('localhost') || domain.includes('127.0.0.1')) return m;
                  return `/stream-proxy/${domain}${path}`;
                });
                
                res.end(text);
              } else {
                // Pipe segment or subtitle file progressively to reduce latency
                if (response.body) {
                  Readable.fromWeb(response.body).pipe(res);
                } else {
                  const arrayBuffer = await response.arrayBuffer();
                  res.end(Buffer.from(arrayBuffer));
                }
              }
            } catch (err) {
              console.error('Proxy error:', err);
              res.statusCode = 500;
              res.end('Proxy error: ' + err.message);
            }
          } else {
            next();
          }
        });
      }
    }
  ],
})
