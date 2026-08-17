// ============================================================
//  DISPLAY HUB — App Core (Modal de Config, Toast, Status)
// ============================================================

// ---- Toast ------------------------------------------------
const toastContainer = (() => {
  const el = document.createElement('div');
  el.className = 'toast-container';
  document.body.appendChild(el);
  return el;
})();

function showToast(type, title, message, duration = 4000) {
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const colorMap = { success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)' };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon" style="color:${colorMap[type]}">${icons[type] || ''}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>`;

  toastContainer.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ---- API Status Indicator ----------------------------------
function updateApiStatus(state) {
  const dots = document.querySelectorAll('.api-status-dot');
  const labels = document.querySelectorAll('.api-status-label');
  dots.forEach(d => { d.className = 'api-status-dot'; if (state) d.classList.add(state); });
  const labelMap = { connected: 'Conectado', error: 'Erro', '': 'Não configurado' };
  labels.forEach(l => l.textContent = labelMap[state] || 'Não configurado');
}

// ---- Config Modal ------------------------------------------
function buildConfigModal() {
  if (document.getElementById('config-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'config-modal';
  modal.className = 'modal-overlay' + (isConfigured() ? ' hidden' : '');
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-header-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 19.07a10 10 0 0 1 0-14.14"/>
          </svg>
        </div>
        <div>
          <div class="modal-title">Configurar Conexão com a API</div>
          <div class="modal-subtitle">Insira as credenciais fornecidas pelo suporte técnico</div>
        </div>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">URL Base do Servidor</label>
          <input id="cfg-base" class="form-control" type="url" placeholder="https://seu-servidor.com/public/v1/" value="${CONFIG.API_BASE}">
          <span class="text-muted" style="font-size:0.75rem">Disponível na seção de Downloads da plataforma</span>
        </div>
        <div class="form-group">
          <label class="form-label">API Token (X-API-Token)</label>
          <input id="cfg-key" class="form-control" type="password" placeholder="Seu token de acesso" value="${CONFIG.API_KEY}">
          <span class="text-muted" style="font-size:0.75rem">Solicite ao suporte técnico</span>
        </div>
        <div id="cfg-error" class="hidden" style="background:var(--danger-bg);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-sm);padding:10px 14px;font-size:0.82rem;color:var(--danger);"></div>
      </div>
      <div class="modal-footer">
        ${isConfigured() ? '<button class="btn btn-secondary" onclick="document.getElementById(\'config-modal\').classList.add(\'hidden\')">Cancelar</button>' : ''}
        <button class="btn btn-primary" onclick="applyConfig()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Salvar e Conectar
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function applyConfig() {
  const base = document.getElementById('cfg-base').value.trim();
  const key  = document.getElementById('cfg-key').value.trim();
  const errEl = document.getElementById('cfg-error');

  errEl.classList.add('hidden');

  if (!base || !key) {
    errEl.textContent = 'Preencha todos os campos.';
    errEl.classList.remove('hidden');
    return;
  }

  saveConfig(base, key);
  updateApiStatus('connected');
  document.getElementById('config-modal').classList.add('hidden');
  showToast('success', 'Conectado!', 'Configuração salva com sucesso.');

  // Trigger page init if defined
  if (typeof onApiConfigured === 'function') onApiConfigured();
}

function openConfigModal() {
  const modal = document.getElementById('config-modal');
  if (modal) {
    document.getElementById('cfg-base').value = CONFIG.API_BASE;
    document.getElementById('cfg-key').value  = CONFIG.API_KEY;
    modal.classList.remove('hidden');
  }
}

// ---- Init --------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  buildConfigModal();
  updateApiStatus(isConfigured() ? 'connected' : '');
});
