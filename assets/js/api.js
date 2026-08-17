// ============================================================
//  DISPLAY HUB — API Client  (v2 — com cache e batching rápido)
// ============================================================

class ApiClient {

  constructor() {
    // Cache de resultados: chave = "start|end" → array de shows
    this._showsCache = new Map();
    // Controle de rate-limit no servidor proxy (que já tem fila de 1.2s)
    // Aqui podemos ser mais agressivos pois o proxy serializa as chamadas
    this._lastCall = 0;
  }

  // ── Requisição base ──────────────────────────────────────
  async _request(endpoint, params = {}) {
    if (!isConfigured()) throw new Error('API não configurada. Configure a URL base e o token.');

    const url = CONFIG.API_BASE.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Token': CONFIG.API_KEY,
        },
        body: JSON.stringify(params),
      });
    } catch (networkErr) {
      throw new Error(
        `Falha de conexão com a API. Verifique se o servidor local (INICIAR DISPLAY HUB.bat) está rodando. Detalhe: ${networkErr.message}`
      );
    }

    if (!response.ok) {
      let errMsg = `Erro HTTP ${response.status}`;
      if (response.status === 429) errMsg = 'Limite de requisições atingido (429). O sistema vai tentar novamente automaticamente.';
      if (response.status === 401 || response.status === 403) errMsg = 'Token inválido ou sem permissão. Verifique a configuração da API.';
      if (response.status === 400) errMsg = 'Parâmetros inválidos (400). Verifique as datas e filtros selecionados.';
      try { const e = await response.json(); errMsg = e.message || errMsg; } catch (_) {}
      throw new Error(errMsg);
    }

    return response.json();
  }

  // ── Helpers ──────────────────────────────────────────────
  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async _requestWithRetry(endpoint, params, retries = 4) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this._request(endpoint, params);
      } catch (err) {
        const is429 = err.message && (err.message.includes('429') || err.message.toLowerCase().includes('many'));
        const is400 = err.message && err.message.includes('400');
        if ((is429 || is400) && attempt < retries) {
          // Backoff: 1s, 2s, 4s, 8s
          const delay = 1000 * Math.pow(2, attempt);
          console.warn(`[API] Retry ${attempt + 1}/${retries} em ${delay}ms — ${err.message}`);
          await this._sleep(delay);
          continue;
        }
        throw err;
      }
    }
  }

  // ── Endpoints simples ────────────────────────────────────
  getContentShows(params)   { return this._request('/stats/content-show/list', params); }
  getDevices(params = {})   { return this._request('/device/list',        { limit: CONFIG.MAX_LIMIT, ...params }); }
  getDeviceFolders(params = {}) { return this._request('/device-folder/list', { limit: CONFIG.MAX_LIMIT, ...params }); }
  getContent(params = {})   { return this._request('/content/list',       { limit: CONFIG.MAX_LIMIT, ...params }); }
  getCampaigns(params = {}) { return this._request('/campaign/list',      { limit: CONFIG.MAX_LIMIT, ...params }); }
  getTags(params = {})      { return this._request('/tag/list',           { limit: CONFIG.MAX_LIMIT, ...params }); }

  // ── Cache ────────────────────────────────────────────────
  _cacheKey(start, end) { return `${start}|${end}`; }

  clearCache() { this._showsCache.clear(); }

  hasCached(start, end) { return this._showsCache.has(this._cacheKey(start, end)); }

  getCached(start, end) { return this._showsCache.get(this._cacheKey(start, end)) || []; }

  // ── Fetch principal: todos os shows de um período ────────
  // ▸ Se já está em cache → retorno imediato (< 1ms)
  // ▸ Senão → batches paralelos de 40 IDs, delay 600ms entre grupos
  async getAllContentShows({ start, end, contentIds, onProgress, forceRefresh = false }) {
    if (!contentIds || contentIds.length === 0) return [];

    const key = this._cacheKey(start, end);

    // ── Cache hit ──────────────────────────────────────────
    if (!forceRefresh && this._showsCache.has(key)) {
      console.log(`[Cache] HIT para ${key} — ${this._showsCache.get(key).length} registros`);
      if (onProgress) onProgress(1, 1, this._showsCache.get(key).length);
      return this._showsCache.get(key);
    }

    // ── Cache miss: busca na API ───────────────────────────
    const BATCH_SIZE   = 10000; // Envia todos os IDs de uma vez só (API aceita arrays grandes)
    const DELAY_MS     = 1000;  // Delay irrelevante se for apenas 1 batch
    const MAX_PER_CALL = 10000;

    // Divide em batches sequenciais
    const batches = [];
    for (let i = 0; i < contentIds.length; i += BATCH_SIZE) {
      batches.push(contentIds.slice(i, i + BATCH_SIZE));
    }

    console.log(`[API] Buscando ${contentIds.length} conteúdos em ${batches.length} batch(es) de ${BATCH_SIZE}`);

    let allResults = [];

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];

      if (onProgress) onProgress(bi + 1, batches.length, allResults.length);

      // Pagina dentro do batch se necessário (raro, mas seguro)
      let offset = 0;
      while (true) {
        const resp = await this._requestWithRetry('/stats/content-show/list', {
          start, end,
          content: batch,
          limit: MAX_PER_CALL,
          offset,
        });

        const items = resp.payload || [];
        allResults = allResults.concat(items);

        const total = resp.pagination?.total ?? 0;
        if (items.length < MAX_PER_CALL || allResults.length >= total) break;
        offset += MAX_PER_CALL;
        await this._sleep(200);
      }

      // Delay entre batches (exceto após o último)
      if (bi < batches.length - 1) await this._sleep(DELAY_MS);
    }

    // Armazena no cache
    this._showsCache.set(key, allResults);
    console.log(`[Cache] SET ${key} — ${allResults.length} registros armazenados`);

    return allResults;
  }
}

const api = new ApiClient();
