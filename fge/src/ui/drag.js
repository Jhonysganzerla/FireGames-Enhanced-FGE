// Faz qualquer elemento arrastável pelo handle.

export function makeDraggable(handleEl, targetEl) {
  let dragging = false, ox = 0, oy = 0;
  handleEl.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    dragging = true;
    const r = targetEl.getBoundingClientRect();
    ox = e.clientX - r.left;
    oy = e.clientY - r.top;
    targetEl.style.transition = 'none';
    targetEl.style.right  = 'auto';
    targetEl.style.bottom = 'auto';
    targetEl.style.left   = r.left + 'px';
    targetEl.style.top    = r.top  + 'px';
    targetEl.style.transform = 'none';
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const x = Math.max(0, Math.min(window.innerWidth  - targetEl.offsetWidth,  e.clientX - ox));
    const y = Math.max(0, Math.min(window.innerHeight - targetEl.offsetHeight, e.clientY - oy));
    targetEl.style.left = x + 'px';
    targetEl.style.top  = y + 'px';
  });
  document.addEventListener('mouseup', () => (dragging = false));
}
