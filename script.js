const STORAGE_KEY = 'split-webpages-state-v1';
const defaults = [
  { url: 'https://example.com', flex: 1 },
  { url: 'https://www.wikipedia.org', flex: 1 }
];
let state = loadState();
const workspace = document.querySelector('#workspace');
const emptyState = document.querySelector('#emptyState');
const template = document.querySelector('#panelTemplate');
const layoutLabel = document.querySelector('#layoutLabel');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.panels)) return { layout: saved.layout || 'horizontal', panels: saved.panels };
  } catch (_) {}
  return { layout: 'horizontal', panels: defaults };
}

function saveState() {
  const panels = [...workspace.querySelectorAll('.panel')].map(panel => ({
    url: panel.querySelector('.url-input').value.trim(),
    flex: Number(panel.dataset.flex) || 1
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: state.layout, panels }));
}

function render() {
  workspace.className = `workspace layout-${state.layout}`;
  layoutLabel.textContent = state.layout === 'horizontal' ? '横向' : '纵向';
  workspace.replaceChildren();
  state.panels.forEach((data, index) => addPanel(data, index));
  emptyState.classList.toggle('hidden', state.panels.length !== 0);
  workspace.classList.toggle('hidden', state.panels.length === 0);
}

function addPanel(data = { url: '', flex: 1 }, index = workspace.querySelectorAll('.panel').length) {
  const panel = template.content.firstElementChild.cloneNode(true);
  panel.dataset.flex = String(data.flex || 1);
  panel.style.flexGrow = String(data.flex || 1);
  panel.querySelector('.panel-number').textContent = `#${index + 1}`;

  const input = panel.querySelector('.url-input');
  const frame = panel.querySelector('.web-frame');
  const placeholder = panel.querySelector('.frame-placeholder');
  input.value = data.url || '';

  if (data.url) loadFrame(frame, placeholder, data.url);

  panel.querySelector('.url-form').addEventListener('submit', event => {
    event.preventDefault();
    const url = normalizeUrl(input.value);
    if (!url) return;
    input.value = url;
    loadFrame(frame, placeholder, url);
    saveState();
  });

  panel.querySelector('.refresh-button').addEventListener('click', () => {
    if (frame.src) {
      frame.contentWindow?.location.reload();
    }
  });

  panel.querySelector('.open-button').addEventListener('click', () => {
    const url = normalizeUrl(input.value);
    if (url) window.open(url, '_blank', 'noopener');
  });

  panel.querySelector('.remove-button').addEventListener('click', () => {
    const panelNode = panel;
    panelNode.remove();
    state.panels = [...workspace.querySelectorAll('.panel')].map((node, i) => ({
      url: node.querySelector('.url-input').value.trim(),
      flex: Number(node.dataset.flex) || 1
    }));
    renumber();
    saveState();
  });

  workspace.appendChild(panel);
  if (index < state.panels.length - 1) addResizer(panel);
}

function normalizeUrl(value) {
  const text = value.trim();
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
}

function loadFrame(frame, placeholder, url) {
  placeholder.style.display = 'none';
  frame.src = url;
  frame.onload = () => { placeholder.style.display = 'none'; };
  frame.onerror = () => {
    placeholder.style.display = 'flex';
    placeholder.querySelector('span').textContent = '该网页拒绝被嵌入，请尝试“↗”在新标签页打开';
  };
}

function addResizer(leftPanel) {
  const resizer = document.createElement('div');
  resizer.className = 'resizer';
  resizer.setAttribute('role', 'separator');
  resizer.setAttribute('aria-label', '调整分屏大小');
  leftPanel.after(resizer);

  let startPos = 0;
  let startA = 0;
  let startB = 0;

  resizer.addEventListener('pointerdown', event => {
    event.preventDefault();
    resizer.setPointerCapture(event.pointerId);
    const other = resizer.nextElementSibling;
    const horizontal = state.layout === 'horizontal';
    startPos = horizontal ? event.clientX : event.clientY;
    startA = leftPanel.getBoundingClientRect()[horizontal ? 'width' : 'height'];
    startB = other ? other.getBoundingClientRect()[horizontal ? 'width' : 'height'] : 0;
    document.body.style.cursor = horizontal ? 'col-resize' : 'row-resize';
  });

  resizer.addEventListener('pointermove', event => {
    if (!resizer.hasPointerCapture(event.pointerId)) return;
    const other = resizer.nextElementSibling;
    if (!other) return;

    const horizontal = state.layout === 'horizontal';
    const delta = (horizontal ? event.clientX : event.clientY) - startPos;
    const total = startA + startB;
    const a = Math.max(130, Math.min(total - 130, startA + delta));

    leftPanel.style.flex = `0 0 ${a}px`;
    other.style.flex = `0 0 ${total - a}px`;
  });

  resizer.addEventListener('pointerup', event => {
    if (!resizer.hasPointerCapture(event.pointerId)) return;
    resizer.releasePointerCapture(event.pointerId);
    document.body.style.cursor = '';

    [...workspace.querySelectorAll('.panel')].forEach(panel => {
      const size = panel.getBoundingClientRect()[state.layout === 'horizontal' ? 'width' : 'height'];
      panel.dataset.flex = String(size);
    });

    saveState();
  });
}

function renumber() {
  workspace.querySelectorAll('.panel-number').forEach((el, i) => {
    el.textContent = `#${i + 1}`;
  });
}

document.querySelector('#addPanelBtn').addEventListener('click', () => {
  state.panels = [...state.panels, { url: '', flex: 1 }];
  render();
  saveState();
});

document.querySelector('#emptyAddBtn').addEventListener('click', () => {
  state.panels = [{ url: '', flex: 1 }];
  render();
  saveState();
});

document.querySelector('#layoutBtn').addEventListener('click', () => {
  state.layout = state.layout === 'horizontal' ? 'vertical' : 'horizontal';
  render();
  saveState();
});

document.querySelector('#resetBtn').addEventListener('click', () => {
  if (confirm('确定要恢复默认分屏吗？')) {
    state = { layout: 'horizontal', panels: defaults.map(item => ({ ...item })) };
    render();
    saveState();
  }
});

render();
