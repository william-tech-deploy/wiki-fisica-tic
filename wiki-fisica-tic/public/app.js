/**
 * app.js - Lógica del frontend (SPA)
 * ---------------------------------------------------------------
 * Flujo: al cargar la página pide categorías y relaciones a la API,
 * guarda las relaciones en memoria y dibuja las tarjetas. La búsqueda
 * y el filtro trabajan sobre esa copia, sin volver al servidor.
 * ---------------------------------------------------------------
 */

// Copia local de las relaciones recibidas de la API
let cacheRelaciones = [];

// Elementos del DOM
const cardsGrid = document.getElementById('cardsGrid');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const loadingStatus = document.getElementById('loadingStatus');
const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const closeModalBtn = document.getElementById('closeModalBtn');

/**
 * Escapa los caracteres especiales de HTML antes de insertar texto en la página.
 * Evita que un dato de la base pueda inyectar etiquetas o scripts.
 */
function escapeHtml(valor) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(valor).replace(/[&<>"']/g, (c) => mapa[c]);
}

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  cargarCategorias();
  cargarRelaciones();

  searchInput.addEventListener('input', filtrarContenido);
  categoryFilter.addEventListener('change', filtrarContenido);

  // Un solo escuchador para todos los botones "Ver análisis"
  cardsGrid.addEventListener('click', (e) => {
    const boton = e.target.closest('.btn-detail');
    if (boton) abrirDetalle(Number(boton.dataset.id));
  });

  // Cierre de la ventana: botón, clic en el fondo o tecla Escape
  closeModalBtn.addEventListener('click', cerrarDetalle);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) cerrarDetalle();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarDetalle();
  });
});

// ---------- Consumo de la API ----------

// Llena el selector con las categorías de física
async function cargarCategorias() {
  try {
    const res = await fetch('/api/categorias');
    if (!res.ok) throw new Error(`Respuesta ${res.status}`);
    const categorias = await res.json();
    categorias.forEach((cat) => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
  } catch (err) {
    console.error('Error al cargar categorías:', err);
  }
}

// Carga todas las relaciones y las dibuja
async function cargarRelaciones() {
  try {
    loadingStatus.textContent = 'Cargando datos...';
    const res = await fetch('/api/relaciones');
    if (!res.ok) throw new Error(`Respuesta ${res.status}`);
    cacheRelaciones = await res.json();
    renderizarTarjetas(cacheRelaciones);
    loadingStatus.classList.add('hidden');
  } catch (err) {
    loadingStatus.textContent = 'No se pudo conectar con la base de datos. Recarga la página para reintentar.';
    console.error(err);
  }
}

// ---------- Vista ----------

// Dibuja una tarjeta por cada relación
function renderizarTarjetas(datos) {
  cardsGrid.innerHTML = '';

  if (datos.length === 0) {
    cardsGrid.innerHTML = '<p class="status-msg">No hay leyes ni componentes que coincidan. Prueba con otra palabra o con "Todas las áreas".</p>';
    return;
  }

  datos.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div>
        <div class="card-header">
          <h3>${escapeHtml(item.ley_nombre)}</h3>
          <span class="badge">${escapeHtml(item.ley_categoria)}</span>
        </div>
        <div class="formula-tag">${escapeHtml(item.ley_formula)}</div>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 0.4rem;">
          ${escapeHtml(item.ley_descripcion)}
        </p>
        <div class="hardware-link">
          <div><strong>Componente:</strong> ${escapeHtml(item.hardware_nombre)}</div>
          <div style="font-size: 0.8rem; color: var(--accent);">${escapeHtml(item.hardware_categoria)}</div>
        </div>
      </div>
      <button class="btn-detail" data-id="${Number(item.relacion_id)}">Ver análisis de ingeniería</button>
    `;
    cardsGrid.appendChild(card);
  });
}

// Búsqueda y filtro sobre la copia local
function filtrarContenido() {
  const texto = searchInput.value.toLowerCase().trim();
  const categoria = categoryFilter.value;

  const filtrados = cacheRelaciones.filter((item) => {
    const coincideTexto =
      item.ley_nombre.toLowerCase().includes(texto) ||
      item.hardware_nombre.toLowerCase().includes(texto) ||
      item.principio_aplicacion.toLowerCase().includes(texto);
    const coincideCategoria = categoria === 'Todas' || item.ley_categoria === categoria;
    return coincideTexto && coincideCategoria;
  });

  renderizarTarjetas(filtrados);
}

// ---------- Ventana de detalle ----------

function abrirDetalle(id) {
  const item = cacheRelaciones.find((r) => r.relacion_id === id);
  if (!item) return;

  modalBody.innerHTML = `
    <h2 style="color: var(--accent); margin-bottom: 0.5rem;">${escapeHtml(item.ley_nombre)} &rarr; ${escapeHtml(item.hardware_nombre)}</h2>
    <span class="formula-tag">${escapeHtml(item.ley_formula)}</span>

    <h4 style="margin-top: 1.2rem; color: #f8fafc;">Principio físico aplicado</h4>
    <p style="color: var(--text-secondary); margin-top: 0.3rem;">${escapeHtml(item.principio_aplicacion)}</p>

    <h4 style="margin-top: 1.2rem; color: #f8fafc;">Impacto en la ingeniería de hardware</h4>
    <p style="color: var(--text-secondary); margin-top: 0.3rem;">${escapeHtml(item.impacto_ingenieria)}</p>

    <h4 style="margin-top: 1.2rem; color: #f8fafc;">Especificación del componente</h4>
    <p style="color: var(--text-secondary); margin-top: 0.3rem;">${escapeHtml(item.hardware_descripcion)}</p>
  `;
  detailModal.classList.remove('hidden');
}

function cerrarDetalle() {
  detailModal.classList.add('hidden');
}
