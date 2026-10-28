const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const config = getDefaultConfig(__dirname);

function getTargetUrl() {
  try {
    const apiFile = fs.readFileSync(path.join(__dirname, 'api.js'), 'utf8');
    const match = apiFile.match(/API_BASE_URL\s*=\s*['"]([^'"]+)['"]/);
    if (match) return match[1];
  } catch {}
  return 'http://10.7.1.51:3000';
}

const originalEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const appMiddleware = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(metroMiddleware, server)
      : metroMiddleware;

    return (req, res, next) => {
      if (req.url.startsWith('/api-proxy')) {
        const targetBase = getTargetUrl();
        const targetUrlObj = new URL(targetBase);
        const isHttps = targetUrlObj.protocol === 'https:';
        const client = isHttps ? https : http;

        const targetPath = req.url.replace('/api-proxy', '') || '/';
        const headers = { ...req.headers, host: targetUrlObj.host };

        const proxyReq = client.request(
          {
            protocol: targetUrlObj.protocol,
            hostname: targetUrlObj.hostname,
            port: targetUrlObj.port || (isHttps ? 443 : 80),
            path: targetPath,
            method: req.method,
            headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          }
        );

        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      return appMiddleware(req, res, next);
    };
  },
};

module.exports = config;
