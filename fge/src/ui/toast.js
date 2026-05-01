// Toast centralizado. Conectado ao bus pra ser disparável de qualquer feature.
import { $ } from '../core/dom.js';

let _t;
export function toast(msg, type = 'info', ms = 2200) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `t-${type}`;
  el.style.display = 'block';
  el.style.animation = 'none';
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight; // reflow para reiniciar animação
  el.style.animation = '';
  clearTimeout(_t);
  _t = setTimeout(() => (el.style.display = 'none'), ms);
}

export function bindToBus(bus) {
  bus.on('toast', ({ msg, type, ms } = {}) => toast(msg, type, ms));
}
