// ============================================================
//  DISPLAY HUB — Configuração e Inicialização
// ============================================================

// Credenciais padrão (podem ser sobrescritas via modal de configuração)
// O servidor local (servidor.js) serve os arquivos E faz proxy da API — sem CORS.
const _DEFAULT_BASE = 'http://localhost:3131/api';
const _DEFAULT_KEY  = '8SUS-V4XZ-H6S5-SW44'; // Token injetado pelo servidor — mantido aqui para o modal de config

const CONFIG = {
  API_BASE: localStorage.getItem('dh_api_base') || _DEFAULT_BASE,
  API_KEY:  localStorage.getItem('dh_api_key')  || _DEFAULT_KEY,
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 10000,
};

function isConfigured() {
  return !!(CONFIG.API_BASE && CONFIG.API_KEY);
}

function saveConfig(base, key) {
  CONFIG.API_BASE = base.trim().replace(/\/$/, '');
  CONFIG.API_KEY  = key.trim();
  localStorage.setItem('dh_api_base', CONFIG.API_BASE);
  localStorage.setItem('dh_api_key',  CONFIG.API_KEY);
}

function clearConfig() {
  CONFIG.API_BASE = '';
  CONFIG.API_KEY  = '';
  localStorage.removeItem('dh_api_base');
  localStorage.removeItem('dh_api_key');
}
