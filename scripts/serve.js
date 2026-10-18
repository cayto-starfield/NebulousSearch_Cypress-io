const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
let testProgress = {
  status: 'idle',
  test: '',
  step: '',
  view: 'dashboard',
  action: 'none',
  sequence: 0
};
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  if (pathname === '/__test-progress') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Cache-Control', 'no-store');

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }).end();
      return;
    }

    if (request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(testProgress));
      return;
    }

    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'GET, POST, OPTIONS' }).end('Method not allowed');
      return;
    }

    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 8192) {
        response.writeHead(413).end('Progress update is too large');
        request.destroy();
      }
    });
    request.on('end', () => {
      let update;
      try {
        update = JSON.parse(body);
      } catch {
        response.writeHead(400).end('Invalid JSON');
        return;
      }

      const validStatuses = ['idle', 'running', 'passed', 'failed'];
      const validViews = ['dashboard', 'quarantine', 'intel'];
      const validActions = ['none', 'expand-stats', 'purge-start', 'purge-complete'];
      if (
        !update ||
        !validStatuses.includes(update.status) ||
        !validViews.includes(update.view) ||
        !validActions.includes(update.action) ||
        typeof update.test !== 'string' ||
        typeof update.step !== 'string' ||
        update.test.length > 200 ||
        update.step.length > 200
      ) {
        response.writeHead(400).end('Invalid test progress update');
        return;
      }

      testProgress = { ...update, sequence: testProgress.sequence + 1 };
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(testProgress));
    });
    return;
  }

  if (pathname === '/') pathname = '/.github/workflows/Index.html';

  const filePath = path.resolve(root, `.${pathname}`);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT' || error.code === 'EISDIR') {
        response.writeHead(404).end('Not found');
        return;
      }

      console.error(`Unable to serve ${pathname}:`, error);
      response.writeHead(500).end('Internal server error');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream'
    });
    response.end(content);
  });
});

const port = Number(process.env.PORT || 8080);
server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});

server.on('error', error => {
  console.error('Unable to start the local test server:', error);
  process.exitCode = 1;
});
