#!/usr/bin/env node
// Front-end dev server for TryAPL.
//
// Serves the repo's static files (index.html, lib/, assets/, fonts/, ...) on a
// local port, and transparently proxies any request that is NOT a file on disk
// (i.e. POST /Exec) to a running TryAPL/Jarvis backend. This lets you edit the
// front end and reload without touching the backend, while real APL evaluation
// still works.
//
//   Usage:  node dev-server.js
//   Config (env vars):
//     PORT      port to serve the front end on          (default 8004)
//     BACKEND   base URL of the existing TryAPL backend (default http://localhost:8080)
//               e.g. BACKEND=https://tryapl.org node dev-server.js
//
// No dependencies — Node's built-ins only.

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { URL } = require('url');

const PORT    = process.env.PORT    || 8004;
const HOST    = process.env.HOST    || '0.0.0.0'; // bind all IPv4 ifaces (reachable from WSL2 host)
const BACKEND = process.env.BACKEND || 'http://localhost:8080';
const ROOT    = __dirname; // repo root (this file lives at the top level)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.eot':  'application/vnd.ms-fontobject',
  '.map':  'application/json',
  '.wav':  'audio/wav',
  '.h':    'text/plain; charset=utf-8',   // assets/elements.h
  '.apln': 'text/plain; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
};

function serveStatic(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache', // always reflect edits on reload
  });
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => { res.writeHead(500); res.end('read error'); });
  stream.pipe(res);
}

function proxy(req, res) {
  let target;
  try { target = new URL(req.url, BACKEND); }
  catch (e) { res.writeHead(502); res.end('bad backend URL'); return; }

  const mod = target.protocol === 'https:' ? https : http;
  const headers = Object.assign({}, req.headers);
  headers.host = target.host;            // route correctly through vhosts/Traefik
  delete headers['accept-encoding'];     // avoid compressed pass-through surprises

  const preq = mod.request(
    target,
    { method: req.method, headers },
    (pres) => {
      res.writeHead(pres.statusCode, pres.headers);
      pres.pipe(res);
    }
  );
  preq.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      `Dev-server proxy could not reach the backend at ${BACKEND}\n` +
      `(${e.code || e.message}).\n\n` +
      `Start the TryAPL backend, or point this server at another one:\n` +
      `  BACKEND=https://tryapl.org node dev-server.js\n`
    );
  });
  req.pipe(preq);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  // Resolve to a path inside ROOT, stripping any ../ traversal.
  let rel = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  let filePath = path.join(ROOT, rel);
  if (urlPath.endsWith('/')) filePath = path.join(filePath, 'index.html');

  const safe = filePath === ROOT || filePath.startsWith(ROOT + path.sep);

  if (safe && (req.method === 'GET' || req.method === 'HEAD')) {
    fs.stat(filePath, (err, st) => {
      if (!err && st.isFile()) serveStatic(req, res, filePath);
      else proxy(req, res); // not a static file → hand off to the backend
    });
  } else {
    proxy(req, res); // POST /Exec and anything non-static
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TryAPL front end:  http://localhost:${PORT}  (bound ${HOST}:${PORT})`);
  console.log(`Proxying /Exec  ->  ${BACKEND}`);
});
