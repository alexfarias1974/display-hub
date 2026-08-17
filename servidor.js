/**
 * DISPLAY HUB — Servidor Local  (v3 — fila serial de API)
 * Serve os arquivos da plataforma E faz proxy das chamadas à API.
 * Ambos na mesma origem (localhost:3131) → sem CORS.
 *
 * FILA SERIAL: apenas 1 chamada à API remota por vez, com cooldown
 * garantido de 1.5s entre elas. Resolve 429 (rate limit) automaticamente.
 *
 * Rode com: node servidor.js
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT     = process.env.PORT || 3131;
const API_BASE = 'https://api.displayforce.ai/public/v1';
const API_KEY  = '8SUS-V4XZ-H6S5-SW44';
const ROOT_DIR = __dirname;

// ── Tipos MIME ────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

// ═══════════════════════════════════════════════════════════
//  FILA SERIAL DE API
//  Garante que apenas 1 chamada à API remota acontece por vez,
//  com intervalo mínimo de MIN_INTERVAL_MS entre cada chamada.
//  Quando uma chamada retorna 429, ela faz retry com backoff
//  exponencial ANTES de liberar a próxima item da fila.
// ═══════════════════════════════════════════════════════════
const MIN_INTERVAL_MS = 10000; // 10s entre chamadas — respeita o rate limit real da API
const MAX_RETRIES     = 2;    // retry somente se 10s não for suficiente (raro)

class ApiQueue {
  constructor() {
    this._queue   = [];
    this._running = false;
    this._lastEnd = 0;   // timestamp de quando a última chamada terminou
  }

  // Adiciona uma tarefa à fila e retorna uma Promise com o resultado
  enqueue(task) {
    return new Promise((resolve, reject) => {
      this._queue.push({ task, resolve, reject });
      this._drain();
    });
  }

  async _drain() {
    if (this._running) return;
    this._running = true;

    while (this._queue.length > 0) {
      // Cooldown: espera o mínimo entre chamadas
      const wait = Math.max(0, this._lastEnd + MIN_INTERVAL_MS - Date.now());
      if (wait > 0) {
        console.log(`  [Fila] cooldown ${wait}ms...`);
        await sleep(wait);
      }

      const item = this._queue.shift();
      try {
        const result = await item.task();
        this._lastEnd = Date.now();
        item.resolve(result);
      } catch (err) {
        this._lastEnd = Date.now();
        item.reject(err);
      }
    }

    this._running = false;
  }
}

const apiQueue = new ApiQueue();

// ── Helpers ───────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Chamada HTTP à API remota (com retry 429) ─────────────
function doApiCall(apiPath, body, clientToken) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(API_BASE + apiPath);
    const bodyBuf = Buffer.from(body, 'utf8');

    const opts = {
      hostname: parsed.hostname,
      path:     parsed.path,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'X-API-Token':    clientToken || API_KEY,
        'Content-Length': bodyBuf.length,
      },
      timeout: 30000,
    };

    const req = https.request(opts, apiRes => {
      const chunks = [];
      apiRes.on('data', c => chunks.push(c));
      apiRes.on('end', () => resolve({ status: apiRes.statusCode, body: Buffer.concat(chunks).toString() }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout na chamada à API')); });
    req.write(bodyBuf);
    req.end();
  });
}

// ── Proxy com fila serial e retry automático ──────────────
async function proxyApiCall(apiPath, body, res, clientToken) {
  const task = async () => {
    let attempt = 0;
    while (true) {
      const result = await doApiCall(apiPath, body, clientToken);
      console.log(`  [API] ${apiPath} → ${result.status}` + (attempt > 0 ? ` (tentativa ${attempt + 1})` : ''));

      if (result.status === 429) {
        attempt++;
        if (attempt > MAX_RETRIES) {
          return result; // desiste após MAX_RETRIES e devolve o 429
        }
        const backoff = 2000 * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s
        console.log(`  [API] 429 → aguardando ${backoff / 1000}s antes de retry ${attempt}/${MAX_RETRIES}...`);
        await sleep(backoff);
        continue;
      }

      return result;
    }
  };

  try {
    const result = await apiQueue.enqueue(task);
    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    res.end(result.body);
  } catch (err) {
    console.error('  [API] Erro de rede:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Erro de conexão com a API', detail: err.message }));
  }
}

// ── Servidor HTTP ─────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname  = parsedUrl.pathname;

  // Health check — inclui tamanho da fila
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      server: 'Display Hub',
      port:   PORT,
      queue:  apiQueue._queue.length,
      busy:   apiQueue._running,
    }));
    return;
  }

  // API proxy — rotas que começam com /api/
  if (pathname.startsWith('/api/')) {
    const apiPath = pathname.replace('/api', '');
    const clientToken = req.headers['x-api-token'];
    console.log(`[REQ ] ${req.method} ${pathname} (fila: ${apiQueue._queue.length})`);

    let body = '';
    req.on('data', c => body += c.toString());
    req.on('end', () => proxyApiCall(apiPath, body || '{}', res, clientToken));
    return;
  }

  // Arquivo estático
  let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Arquivo não encontrado: ${pathname}`);
      } else {
        res.writeHead(500); res.end('Server error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║         DISPLAY HUB — Servidor Local  v3         ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Acesse: http://localhost:${PORT}                   ║`);
  console.log('║                                                  ║');
  console.log('║  Fila serial de API ativada (1 chamada por vez)  ║');
  console.log('║  Retry automático em caso de rate limit (429)    ║');
  console.log('║                                                  ║');
  console.log('║  Mantenha esta janela aberta.                    ║');
  console.log('║  Pressione Ctrl+C para encerrar.                 ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const { exec } = require('child_process');
  exec('start http://localhost:3131');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERRO] Porta ${PORT} já em uso.`);
    console.error('O servidor já está rodando. Abra: http://localhost:' + PORT + '\n');
  } else {
    console.error('[ERRO]', err.message);
  }
});

process.on('SIGINT', () => {
  console.log('\n\nServidor encerrado. Até logo!\n');
  process.exit(0);
});
