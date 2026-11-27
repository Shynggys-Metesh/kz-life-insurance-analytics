import {load} from './data.js';
import {ROUTES} from './views.js';
import {disposeAll} from './charts.js';
import {h} from './ui.js';

const I = {
  grid: '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  shield: '<path d="M12 3l7 3v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z"/>',
  building: '<path d="M4 21V5l8-2v18M12 8h8v13M8 8v.5M8 12v.5M8 16v.5M16 12v.5M16 16v.5M2 21h20"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0zM19 7l-3 7a4 4 0 0 0 6 0zM8 21h8"/>',
  pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  doc: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.4.7 4 2.9 4 6"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[k] || ''}</svg>`;

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const content = document.getElementById('content');
const title = document.getElementById('title');

function buildNav() {
  const groups = {};
  ROUTES.filter(r => !r.hidden).forEach(r => (groups[r.group] ||= []).push(r));
  nav.replaceChildren(...Object.entries(groups).map(([gname, rs]) => h('div', {class: 'nav-group'}, h('div', {class: 'nav-title'}, gname),
    ...rs.map(r => h('a', {class: 'nav-item', href: '#/' + r.id, 'data-id': r.id, html: svg(r.icon) + `<span>${r.title}</span>` + (r.tag ? `<span class="tag">${r.tag}</span>` : '')})))));
}

function render() {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0];
  const route = ROUTES.find(r => r.id === id) || ROUTES[0];
  disposeAll();
  nav.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.id === route.id));
  title.textContent = route.title;
  document.title = route.id ? `${route.title} · Financial Intelligence KZ` : 'Financial Intelligence Kazakhstan';
  content.replaceChildren();
  try { route.render(content); } catch (e) { console.error(e); content.append(h('div', {class: 'err'}, 'Ошибка отображения раздела: ' + e.message)); }
  app.classList.remove('open');
  window.scrollTo(0, 0);
}

document.getElementById('menu').addEventListener('click', () => app.classList.toggle('open'));
app.addEventListener('click', (e) => { if (app.classList.contains('open') && e.target === app) app.classList.remove('open'); });

buildNav();
load().then(() => { window.addEventListener('hashchange', render); render(); })
  .catch((e) => { content.replaceChildren(h('div', {class: 'err'}, 'Не удалось загрузить данные: ' + e.message)); });
