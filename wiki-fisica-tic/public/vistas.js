/**
 * vistas.js
 * ---------------------------------------------------------------
 * Pestañas de la wiki: Relaciones, Componentes animados y Calculadoras.
 * La pestaña activa se guarda en la dirección (#componentes, #calculadoras)
 * para poder compartir el enlace o recargar sin perder el sitio.
 * ---------------------------------------------------------------
 */
const VISTAS = ['relaciones', 'componentes', 'calculadoras'];

function mostrarVista(nombre, { enfocar = false } = {}) {
  if (!VISTAS.includes(nombre)) nombre = 'relaciones';
  VISTAS.forEach((v) => {
    const activa = v === nombre;
    const tab = document.getElementById(`tab-${v}`);
    tab.classList.toggle('activa', activa);
    tab.setAttribute('aria-selected', String(activa));
    tab.tabIndex = activa ? 0 : -1;
    document.getElementById(`vista-${v}`).hidden = !activa;
    if (activa && enfocar) tab.focus();
  });
  const destino = nombre === 'relaciones' ? location.pathname + location.search : `#${nombre}`;
  history.replaceState(null, '', destino);
  // Las animaciones se cargan solo cuando se abre su pestaña
  if (nombre === 'componentes' && typeof cargarComponentes === 'function') cargarComponentes();
  if (nombre === 'calculadoras' && typeof montarCalculadoras === 'function') montarCalculadoras();
}

// Para abrir una calculadora desde otra parte de la página (por ejemplo, desde la vista ampliada)
function irACalculadora(clave) {
  mostrarVista('calculadoras');
  const tarjeta = document.getElementById(`calc-${clave}`);
  if (!tarjeta) return;
  tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
  tarjeta.classList.add('resaltada');
  setTimeout(() => tarjeta.classList.remove('resaltada'), 2200);
  const campo = tarjeta.querySelector('input');
  if (campo) campo.focus({ preventScroll: true });
}

document.addEventListener('DOMContentLoaded', () => {
  const tabs = [...document.querySelectorAll('.tab')];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => mostrarVista(tab.dataset.vista));
    // Flechas izquierda y derecha entre pestañas
    tab.addEventListener('keydown', (e) => {
      let siguiente = null;
      if (e.key === 'ArrowRight') siguiente = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') siguiente = tabs[(i - 1 + tabs.length) % tabs.length];
      if (!siguiente) return;
      e.preventDefault();
      mostrarVista(siguiente.dataset.vista, { enfocar: true });
    });
  });
  mostrarVista(location.hash.replace('#', ''));
});
