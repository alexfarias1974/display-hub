/**
 * DISPLAY HUB — Proxy Local
 * Resolve o bloqueio de CORS ao fazer chamadas à API a partir do navegador.
 * Rode com: node proxy.js
 */

const http  = require('http');
const https = require('https');
const url   = require('url');

const PORT     = 3131;
const API_BASE = 'https://api.displayforce.ai/public/v1';
const API_KEY  = '8SUS-V4XZ-H6S5-SW44';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Token, X-Requested-With',
  'Access-Control-Max-Age':       '86400',
};

// Rate limiting simples: fila de requisições com delay mínimo entre chamadas
const QUEUE_DELAY_MS = 1200; // mínimo 1.2s entre chamadas à API real
let lastCallTime = 0;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForRateLimit() {
  const now    = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < QUEUE_DELAY_MS) {
    await sleep(QUEUE_DELAY_MS - elapsed);
  }
  lastCallTime = Date.now();
}

function proxyRequest(targetPath, body, res, retries = 3) {
  const parsedUrl = url.parse(API_BASE + targetPath);

  const options = {
    hostname: parsedUrl.hostname,
    path:     parsedUrl.path,
    method:   'POST',
    headers:  {
      'Content-Type':  'application/json',
      'X-API-Token':   API_KEY,
      'Content-Length': Buffer.byteLength(body),
    },
  };

  const req = https.request(options, apiRes => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', async () => {
      // Retry on 429
      if (apiRes.statusCode === 429 && retries > 0) {
        const delay = 3000 * (4 - retries);
        console.log(`[PROXY] Rate limit 429. Aguardando ${delay}ms antes de retry (${retries} tentativas restantes)...`);
        await sleep(delay);
        return proxyRequest(targetPath, body, res, retries - 1);
      }

      console.log(`[PROXY] ${targetPath} → ${apiRes.statusCode}`);

      res.writeHead(apiRes.statusCode, {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
      });
      res.end(data);
    });
  });

  req.on('error', err => {
    console.error('[PROXY] Erro:', err.message);
    res.writeHead(502, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', detail: err.message }));
  });

  req.write(body);
  req.end();
}

const server = http.createServer(async (req, res) => {
  // Responde preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', proxy: 'Display Hub Proxy', port: PORT }));
    return;
  }

  // Só aceita POST
  if (req.method !== 'POST') {
    res.writeHead(405, CORS_HEADERS);
    res.end('Method not allowed');
    return;
  }

  // Lê o body da requisição
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', async () => {
    const targetPath = req.url; // e.g. /device/list
    console.log(`[PROXY] ${req.method} ${targetPath}`);

    await waitForRateLimit();
    proxyRequest(targetPath, body, res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       DISPLAY HUB — Proxy Local          ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Rodando em: http://localhost:${PORT}       ║`);
  console.log(`║  API alvo:   ${API_BASE.slice(0,25)}...  ║`);
  console.log('║                                          ║');
  console.log('║  Mantenha esta janela aberta.            ║');
  console.log('║  Pressione Ctrl+C para encerrar.         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERRO] Porta ${PORT} já está em uso. O proxy já pode estar rodando.`);
    console.error('Feche a outra janela ou mude a porta no arquivo proxy.js\n');
  } else {
    console.error('[ERRO]', err.message);
  }
  process.exit(1);
});
