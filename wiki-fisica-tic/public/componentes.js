/**
 * componentes.js
 * ---------------------------------------------------------------
 * Pestaña «Componentes animados»: una tarjeta por componente con su figura
 * isométrica en miniatura, y una vista ampliada («Ampliar») con la figura en
 * grande, la explicación y los enlaces a las calculadoras.
 *
 * Las figuras son páginas independientes de /figuras (se generan con
 * npm run figuras) y se muestran en iframes. Con ?mini la figura oculta su
 * leyenda para caber en la tarjeta.
 * ---------------------------------------------------------------
 */
let cacheComponentes = [];
let componentesCargados = false;
let ultimoFoco = null;

const NOMBRES_CALCULADORA = {
  joule: 'Efecto Joule',
  ohm: 'Ley de Ohm',
  capacitancia: 'Capacitancia',
  faraday: 'Faraday',
};

// Escapado propio para no depender del orden de carga de los scripts
function esc(valor) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(valor).replace(/[&<>"']/g, (c) => mapa[c]);
}

async function cargarComponentes() {
  if (componentesCargados) return;
  const estado = document.getElementById('componentesStatus');
  const rejilla = document.getElementById('componentesGrid');
  try {
    estado.classList.remove('hidden');
    estado.textContent = 'Cargando componentes...';
    const res = await fetch('/api/componentes');
    if (!res.ok) throw new Error(`Respuesta ${res.status}`);
    cacheComponentes = await res.json();
    componentesCargados = true;
    estado.classList.add('hidden');
    dibujarComponentes(rejilla);
  } catch (err) {
    estado.textContent = 'No se pudieron cargar los componentes. Vuelve a abrir esta pestaña para reintentar.';
    console.error(err);
  }
}

function dibujarComponentes(rejilla) {
  rejilla.replaceChildren();
  if (cacheComponentes.length === 0) {
    rejilla.innerHTML = '<p class="status-msg">Todavía no hay componentes registrados.</p>';
    return;
  }
  cacheComponentes.forEach((c) => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'card card-componente';
    const visual = c.figura
      ? `<iframe class="figura-mini" src="${esc(c.figura)}?mini" title="Figura animada: ${esc(c.nombre)}" loading="lazy"></iframe>`
      : '<div class="figura-pendiente">Animación en preparación</div>';
    tarjeta.innerHTML = `
      ${visual}
      <div class="card-header">
        <h3>${esc(c.nombre)}</h3>
        <span class="badge">${esc(c.categoria)}</span>
      </div>
      <button class="btn-detail" data-id="${Number(c.id)}">Ampliar</button>
    `;
    rejilla.appendChild(tarjeta);
  });
}

// ---------- Vista ampliada ----------
function abrirAmpliar(id) {
  const c = cacheComponentes.find((x) => x.id === id);
  if (!c) return;
  const cuerpo = document.getElementById('ampliarBody');
  const relaciones = c.relaciones
    .map((r) => {
      const calc = r.calculadora
        ? `<button class="btn-calc" data-calc="${esc(r.calculadora)}">Abrir calculadora de ${esc(NOMBRES_CALCULADORA[r.calculadora] || r.calculadora)}</button>`
        : '';
      return `
        <section class="ampliar-relacion">
          <h4>${esc(r.ley_nombre)} <span class="badge">${esc(r.ley_categoria)}</span></h4>
          <div class="formula-tag">${esc(r.ley_formula)}</div>
          <p><strong>Principio:</strong> ${esc(r.principio_aplicacion)}</p>
          <p><strong>Impacto:</strong> ${esc(r.impacto_ingenieria)}</p>
          ${calc}
        </section>`;
    })
    .join('');
  const figura = c.figura
    ? `<iframe class="figura-grande" src="${esc(c.figura)}" title="Figura animada ampliada: ${esc(c.nombre)}"></iframe>`
    : '<div class="figura-pendiente figura-grande">Animación en preparación</div>';
  cuerpo.innerHTML = `
    <h2 class="ampliar-titulo">${esc(c.nombre)}</h2>
    <span class="badge">${esc(c.categoria)}</span>
    ${figura}
    <p class="ampliar-desc">${esc(c.descripcion)}</p>
    ${relaciones || '<p class="status-msg">Este componente aún no tiene leyes asociadas.</p>'}
  `;
  const modal = document.getElementById('ampliarModal');
  ultimoFoco = document.activeElement;
  modal.classList.remove('hidden');
  document.getElementById('closeAmpliarBtn').focus();
}

function cerrarAmpliar() {
  const modal = document.getElementById('ampliarModal');
  if (modal.classList.contains('hidden')) return;
  modal.classList.add('hidden');
  // Se vacía para que la figura deje de animarse en segundo plano
  document.getElementById('ampliarBody').replaceChildren();
  if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('ampliarModal');
  document.getElementById('componentesGrid').addEventListener('click', (e) => {
    const boton = e.target.closest('.btn-detail');
    if (boton) abrirAmpliar(Number(boton.dataset.id));
  });
  document.getElementById('closeAmpliarBtn').addEventListener('click', cerrarAmpliar);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrarAmpliar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarAmpliar();
  });
  // Botones «Abrir calculadora» dentro de la vista ampliada
  document.getElementById('ampliarBody').addEventListener('click', (e) => {
    const boton = e.target.closest('.btn-calc');
    if (!boton) return;
    ultimoFoco = null;
    cerrarAmpliar();
    irACalculadora(boton.dataset.calc);
  });
});
