// ============================================================
//  DISPLAY HUB — Multi-Select Component
// ============================================================

class MultiSelect {
  constructor(containerId, { placeholder = 'Selecione...', searchPlaceholder = 'Buscar...', onChange } = {}) {
    this.container     = document.getElementById(containerId);
    this.placeholder   = placeholder;
    this.searchPH      = searchPlaceholder;
    this.onChange      = onChange || (() => {});
    this.options       = [];   // { value, label }
    this.selected      = new Set();
    this.isOpen        = false;
    this._render();
    this._bindGlobal();
  }

  setOptions(options) {
    this.options = options;
    this._renderDropdown();
  }

  getSelected() {
    return [...this.selected];
  }

  clear() {
    this.selected.clear();
    this._updateDisplay();
    this.onChange([]);
  }

  setValue(values) {
    this.selected = new Set(values.map(String));
    this._updateDisplay();
  }

  _render() {
    this.container.innerHTML = '';
    this.container.style.position = 'relative';

    this.display = document.createElement('div');
    this.display.className = 'multi-select-display';
    this.display.addEventListener('click', e => {
      e.stopPropagation();
      this._toggle();
    });

    this.chipsArea = document.createElement('span');
    this.chipsArea.className = 'multi-select-chips-area';
    this.chipsArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;flex:1;min-width:0;';

    this.placeholderEl = document.createElement('span');
    this.placeholderEl.className = 'multi-select-placeholder';
    this.placeholderEl.textContent = this.placeholder;

    this.arrow = document.createElement('span');
    this.arrow.className = 'multi-select-arrow';
    this.arrow.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>`;

    this.display.appendChild(this.chipsArea);
    this.display.appendChild(this.arrow);
    this.container.appendChild(this.display);

    // Dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'multi-select-dropdown';
    this.dropdown.style.display = 'none';

    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'multi-select-search';
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = this.searchPH;
    this.searchInput.addEventListener('input', () => this._renderOptions());
    this.searchInput.addEventListener('click', e => e.stopPropagation());
    searchWrapper.appendChild(this.searchInput);
    this.dropdown.appendChild(searchWrapper);

    this.optionsList = document.createElement('div');
    this.optionsList.className = 'multi-select-options';
    this.dropdown.appendChild(this.optionsList);

    this.container.appendChild(this.dropdown);
    this._updateDisplay();
  }

  _toggle() {
    this.isOpen ? this._close() : this._open();
  }

  _open() {
    this.isOpen = true;
    this.display.classList.add('open');
    this.dropdown.style.display = 'flex';
    this.searchInput.value = '';
    this._renderOptions();
    setTimeout(() => this.searchInput.focus(), 50);
  }

  _close() {
    this.isOpen = false;
    this.display.classList.remove('open');
    this.dropdown.style.display = 'none';
  }

  _bindGlobal() {
    document.addEventListener('click', e => {
      if (!this.container.contains(e.target)) this._close();
    });
  }

  _renderOptions() {
    const q = (this.searchInput.value || '').toLowerCase();
    const filtered = this.options.filter(o => o.label.toLowerCase().includes(q));

    this.optionsList.innerHTML = '';
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'multi-select-empty';
      empty.textContent = q ? 'Nenhum resultado encontrado.' : 'Nenhuma opção disponível.';
      this.optionsList.appendChild(empty);
      return;
    }

    filtered.forEach(opt => {
      const isSel = this.selected.has(String(opt.value));
      const item = document.createElement('div');
      item.className = `multi-select-option${isSel ? ' selected' : ''}`;
      item.innerHTML = `
        <div class="multi-select-checkbox">
          ${isSel ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
        </div>
        <span>${opt.label}</span>`;
      item.addEventListener('click', e => {
        e.stopPropagation();
        this._toggle_item(String(opt.value));
      });
      this.optionsList.appendChild(item);
    });
  }

  _renderDropdown() { if (this.isOpen) this._renderOptions(); }

  _toggle_item(value) {
    if (this.selected.has(value)) this.selected.delete(value);
    else this.selected.add(value);
    this._updateDisplay();
    this._renderOptions();
    this.onChange([...this.selected]);
  }

  _updateDisplay() {
    this.chipsArea.innerHTML = '';

    if (this.selected.size === 0) {
      const ph = document.createElement('span');
      ph.className = 'multi-select-placeholder';
      ph.textContent = this.placeholder;
      this.chipsArea.appendChild(ph);
    } else {
      [...this.selected].forEach(val => {
        const opt = this.options.find(o => String(o.value) === val);
        const label = opt ? opt.label : val;
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.style.fontSize = '0.72rem';
        chip.innerHTML = `${label}<span class="chip-remove" data-val="${val}">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>`;
        chip.querySelector('.chip-remove').addEventListener('click', e => {
          e.stopPropagation();
          this.selected.delete(val);
          this._updateDisplay();
          this._renderOptions();
          this.onChange([...this.selected]);
        });
        this.chipsArea.appendChild(chip);
      });
    }
  }
}
