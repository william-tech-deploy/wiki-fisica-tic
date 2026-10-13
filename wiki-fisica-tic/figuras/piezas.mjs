/**
 * piezas.mjs
 * ---------------------------------------------------------------
 * Piezas de dibujo y motor de animación que comparten las figuras nuevas
 * (VRM, memoria DRAM y fuente). El disipador tiene su propio código y no usa
 * este archivo.
 *
 *  - crearPiezas(P): placa base, regla con deslizador y pantalla numérica.
 *  - VIVO: texto de JavaScript que se incrusta en la página de cada figura.
 *    Mueve un deslizador con el cursor, con las flechas o solo (recorrido
 *    automático) y llama a la función `avanzar` de la figura en cada cuadro.
 * ---------------------------------------------------------------
 */
import { k } from "./comun.mjs";

export function crearPiezas(P) {
  const en = (punto) => k.iso(punto, P);
  const S = (rutas, estilo) => k.solidSvg(rutas, estilo);
  const L = (d, estilo) => k.lineSvg(d, estilo);
  const D = (puntos, estilo) => k.dotsSvg(puntos, estilo);

  // Placa de fondo con patas, ranura y tornillos en las esquinas
  function placaBase(PLACA, grosor = 10, pata = 5) {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLACA, -grosor - pata, grosor, P)}"/>`];
    const ordenadas = [...k.corners(PLACA, 22)].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
    for (const [x, y] of ordenadas) {
      out.push(S(k.cylinder(x, y, 7, -grosor - pata, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -grosor - pata + 1.6, pata - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLACA, -grosor, grosor, P, 8, 1.6), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(PLACA, 5), 0, P), { tone: "lo" }));
    const tornillos = k.corners(PLACA, 10);
    out.push(L(tornillos.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(tornillos.map(([x, y]) => en([x, y, 0])), { size: 0.5 }));
    return out.join("");
  }

  // Regla con marcas. Devuelve el dibujo de la regla fija.
  function regla(REGLA) {
    const out = [];
    out.push(S(k.slabOf(REGLA, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const marcas = k.topTicks(REGLA.x + 4, REGLA.x + REGLA.w - 4, 4, 5, REGLA.y + 0.8, 0.6, [2, 3.6], P);
    out.push(L(marcas.minor, { tone: "lo" }), L(marcas.major, { tone: "mid" }));
    out.push(D([en([REGLA.x + 2, REGLA.y + 4.5, 0.6]), en([REGLA.x + REGLA.w - 2, REGLA.y + 4.5, 0.6])], { size: 0.45 }));
    return out.join("");
  }

  // Deslizador dibujado en x = 0; la página lo mueve con translateAlong. `y` es su borde trasero.
  function deslizador(y, w = 22, d = 21) {
    const plan = { x: -w / 2, y, w, d, r: 3 };
    const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0.6, 0.1, P)}" style="filter:blur(4px)"/>`];
    out.push(S(k.slabOf(plan, 0.6, 5, P, 4, 0.6), { tone: "hi", crease: "lo" }));
    out.push(L(k.lineOnTop([0, y], [0, y + d], 5.6, P), { tone: "hi" }));
    const dx = w / 2 - 4;
    out.push(D([en([-dx, y + 4, 5.6]), en([dx, y + 4, 5.6]), en([-dx, y + d - 4, 5.6]), en([dx, y + d - 4, 5.6])], { size: 0.45 }));
    return out.join("");
  }

  // Caja con una pantalla en la cara superior. `parte` marca el texto para cambiarlo desde la página.
  function pantalla(CAJA, texto, parte, alto = 14) {
    const out = [`<path class="iso-halo" d="${k.haloOf(CAJA, 0, alto, P)}"/>`];
    out.push(S(k.slabOf(CAJA, 0, alto, P, 5, 0.8), { tone: "mid" }));
    const ventana = { x: CAJA.x + 6, y: CAJA.y + 6, w: CAJA.w - 12, d: 14, r: 2 };
    out.push(S(k.slabOf(ventana, alto, 0.6, P, 3), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(CAJA, 3), alto, P, 5), { tone: "faint" }));
    out.push(D(k.corners(CAJA, 6).map(([x, y]) => en([x, y, alto])), { size: 0.45 }));
    const t = k.faceTextSvg(k.topMatrix([ventana.x + ventana.w / 2, ventana.y + 10.6], alto + 0.6, P, "x"), texto, {
      size: 7.2,
      tone: "hi",
      anchor: "middle",
    });
    out.push(t.replace("<text ", `<text data-part="${parte}" `));
    out.push(L(k.lineOnTop([CAJA.x + 8, CAJA.y + 27], [CAJA.x + 26, CAJA.y + 27], alto, P), { tone: "lo", free: true }));
    return out.join("");
  }

  return { en, S, L, D, placaBase, regla, deslizador, pantalla };
}

// Fracciones (0 a 1) del ancho del dibujo entre las que el cursor recorre todo el rango del deslizador:
// el ancho de la placa en pantalla, con un margen del 10 % a cada lado.
export function rangoPantalla(P, plan, ancho) {
  const xs = k.corners(plan).map(([x, y]) => k.iso([x, y, 0], P)[0]);
  const a = Math.min(...xs);
  const b = Math.max(...xs);
  const margen = (b - a) * 0.1;
  return [(a + margen) / ancho, (b - margen) / ancho];
}

// Ordena elementos de atrás hacia adelante. `punto(it)` devuelve [x, y] del elemento.
export const ordenar = (P, items, punto = (it) => it) =>
  [...items].sort((a, b) => k.depthOf([...punto(a), 0], P) - k.depthOf([...punto(b), 0], P));

/**
 * Motor de animación (se incrusta en la página).
 *   crearVivo({ stage, svg, xMin, xMax, inicio, tour, tourSeg, pantalla: [f0, f1], avanzar })
 *   avanzar(dt, x, quieto) actualiza el modelo y el dibujo; devuelve true mientras algo siga cambiando.
 * `pantalla` son las fracciones (0 a 1) del ancho del dibujo donde están los extremos de la regla.
 */
export const VIVO = `
const quieto = matchMedia("(prefers-reduced-motion: reduce)");
const acotar = (v, a, b) => Math.min(b, Math.max(a, v));
function crearVivo({ stage, svg, xMin, xMax, inicio, tour, tourSeg = 3.4, pantalla, avanzar }) {
  let x = inicio, meta = inicio, reloj = 0, giraSolo = !quieto.matches, visible = false, frame = 0, ultimo = 0, espera = 0;
  function paso(ahora) {
    const dt = ultimo ? Math.min((ahora - ultimo) / 1000, 1 / 30) : 1 / 60;
    ultimo = ahora;
    if (giraSolo) { reloj += dt; meta = tour[Math.floor(reloj / tourSeg) % tour.length]; }
    x = quieto.matches ? meta : x + (meta - x) * (1 - Math.exp(-dt / 0.35));
    const sigue = avanzar(dt, x, quieto.matches);
    frame = visible && (sigue || !quieto.matches) ? requestAnimationFrame(paso) : 0;
  }
  function arrancar() { if (!frame && visible) { ultimo = 0; frame = requestAnimationFrame(paso); } }
  function dirigir(nuevo) {
    giraSolo = false; meta = acotar(nuevo, xMin, xMax); clearTimeout(espera);
    espera = setTimeout(() => { giraSolo = !quieto.matches; reloj = 0; arrancar(); }, 4200);
    arrancar();
  }
  new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) arrancar(); }, { rootMargin: "120px 0px" }).observe(stage);
  stage.addEventListener("pointermove", (ev) => {
    const caja = svg.getBoundingClientRect();
    const parte = acotar(((ev.clientX - caja.left) / caja.width - pantalla[0]) / (pantalla[1] - pantalla[0]), 0, 1);
    dirigir(xMin + parte * (xMax - xMin));
  });
  stage.addEventListener("pointerleave", () => dirigir(meta));
  stage.addEventListener("keydown", (ev) => {
    const salto = (xMax - xMin) / 12;
    let nuevo = null;
    if (ev.key === "ArrowRight" || ev.key === "ArrowUp") nuevo = meta + salto;
    if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") nuevo = meta - salto;
    if (ev.key === "Home") nuevo = xMin;
    if (ev.key === "End") nuevo = xMax;
    if (nuevo === null) return;
    ev.preventDefault();
    dirigir(nuevo);
  });
  avanzar(0, x, true);
  return { get meta() { return meta; }, dirigir };
}
`;
