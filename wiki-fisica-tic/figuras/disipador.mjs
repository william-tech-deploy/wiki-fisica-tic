/**
 * disipador.mjs  ·  Figura 1: disipador térmico con heatpipes
 * ---------------------------------------------------------------
 * Idea: toda la potencia eléctrica que consume el procesador se convierte
 * en calor (efecto Joule, Q = I² · R · t). Un disipador de torre lo evacúa:
 * la base toma el calor del procesador, cuatro heatpipes lo suben a las
 * aletas y el ventilador lo expulsa.
 *
 * Qué se mueve: un deslizador sobre una regla fija la potencia del
 * procesador (10 a 250 W). Con ella suben la corriente, la temperatura y las
 * revoluciones del ventilador; las marcas de calor corren por los heatpipes
 * más deprisa y la pantalla del termómetro marca la temperatura.
 *
 * Uso:  node figuras/disipador.mjs
 * ---------------------------------------------------------------
 */
import { k, escribirPagina, porProfundidad } from "./comun.mjs";

const ANCHO = 640;
const ALTO = 470;

// ------------------------------------------------------------------
// 1. MODELO FÍSICO (valores del procesador de ejemplo)
// ------------------------------------------------------------------
const VCORE = 1.2; // tensión del núcleo, V
const T_AMB = 25; // temperatura ambiente, °C
const P_MIN = 10;
const P_MAX = 250;

// ------------------------------------------------------------------
// 2. GEOMETRÍA (unidades del mundo, z hacia arriba)
// ------------------------------------------------------------------
const PLACA = { x: -138, y: -112, w: 276, d: 224, r: 8 };
const PLACA_H = 10;
const PATA_H = 5;

const ZOCALO = { x: -60, y: -60, w: 120, d: 120, r: 5 };
const ZOCALO_H = 4;
const IHS = { x: -36, y: -36, w: 72, d: 72, r: 3 }; // tapa metálica del procesador
const IHS_Z = 4;
const IHS_H = 5;
const BASE = { x: -31, y: -31, w: 62, d: 62, r: 4 }; // base de cobre del disipador
const BASE_Z = 9;
const BASE_TOP = 19;

const ALETA = { x: -42, y: -42, w: 84, d: 84, r: 3 };
const ALETA_E = 1.4; // espesor de cada aleta
const PASO = 6.4;
const INFERIORES = [36, 42.4, 48.8, 55.2]; // z de la cara baja de cada aleta
const SUPERIORES = Array.from({ length: 7 }, (_, i) => 92 + PASO * i);
const INF_TOPE = INFERIORES[INFERIORES.length - 1] + ALETA_E;
const SUP_TOPE = SUPERIORES[SUPERIORES.length - 1] + ALETA_E;

const TUBO_R = 4;
const COLLAR_H = 0.9;
const TUBOS = [-24, -8, 8, 24].map((x) => [x, 18]);

const VENTILADOR = { x: -42, y: -42, w: 84, d: 84, r: 7 };
const VENT_TOPE = SUP_TOPE + 20.8;
const VENT_FONDO = VENT_TOPE - 7;
const VENT_R = 37;
const ESC = VENT_R / 44; // las aspas se dibujan para un radio de 44
const ASPAS = 7;

const REGLA = { x: -120, y: 84, w: 178, d: 9, r: 1 };
const DESLIZ_X = [-108, 46]; // recorrido del centro del deslizador
const DESLIZ_Z = 0.6;
const DESLIZ_TOPE = 5.6;

const CAJA = { x: 78, y: 72, w: 56, d: 34, r: 4 }; // termómetro
const CAJA_H = 14;
const POSTE = [66, 34];
const POSTE_H = 14.6;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLACA, -PLATA_H_TOTAL(), 0),
    ...k.boxCorners(VENTILADOR, 0, VENT_TOPE + 2),
    ...k.boxCorners(CAJA, 0, CAJA_H),
  ],
  ANCHO,
  ALTO,
  { pad: 34, azimuth: 42 },
);
function PLATA_H_TOTAL() {
  return PLACA_H + PATA_H;
}

const en = (punto) => k.iso(punto, P);
const S = (rutas, estilo) => k.solidSvg(rutas, estilo);
const L = (d, estilo) => k.lineSvg(d, estilo);
const D = (puntos, estilo) => k.dotsSvg(puntos, estilo);
const atrasAdelante = porProfundidad(P);

// ------------------------------------------------------------------
// 3. PIEZAS
// ------------------------------------------------------------------

// Placa base con patas, ranura y tornillos
function placa() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLACA, -PLACA_H - PATA_H, PLACA_H, P)}"/>`];
  for (const [x, y] of atrasAdelante(k.corners(PLACA, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLACA_H - PATA_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLACA_H - PATA_H + 1.6, PATA_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLACA, -PLACA_H, PLACA_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLACA, 5), 0, P), { tone: "lo" }));
  const tornillos = k.corners(PLACA, 10);
  out.push(L(tornillos.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(tornillos.map(([x, y]) => en([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

// Cable de la sonda de temperatura sobre la placa: sale del poste y se mete bajo la caja
function cablePlaca() {
  const tramos = [
    [[POSTE[0], POSTE[1], 0.6], [POSTE[0], 92, 0.6]],
    [[POSTE[0], 92, 0.6], [CAJA.x, 92, 0.6]],
  ];
  return L(tramos.map(([a, b]) => k.segment(a, b, P)).join(""), { tone: "mid" });
}

// Zócalo del procesador con palanca y la tapa metálica (lo único "lit": el origen del calor)
function zocalo() {
  const out = [];
  out.push(S(k.slabOf(ZOCALO, 0, ZOCALO_H, P, 5, 0.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(ZOCALO, 3), ZOCALO_H, P), { tone: "faint" }));
  const esquinas = k.corners(ZOCALO, 7);
  out.push(D(esquinas.map(([x, y]) => en([x, y, ZOCALO_H])), { size: 0.45 }));
  out.push(S(k.slabOf({ x: -54, y: 61, w: 80, d: 4, r: 1.5 }, 0, 4, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(-54 + 2, 63, 3.2, 0, 7, P, 16), { tone: "mid" }));
  return out.join("");
}

function tapa() {
  const out = [];
  out.push(S(k.slabOf(IHS, IHS_Z, IHS_H, P, 4, 0.5), { tone: "hi", lit: true, crease: "lo" }));
  out.push(
    `<path data-part="brillo" class="iso-line" data-tone="lit" d="${k.planOutline(k.insetPlan(IHS, 2), IHS_Z + IHS_H, P, 4)}" style="stroke-width:1.1;opacity:.6"/>`,
  );
  return out.join("");
}

// Base de cobre con orejas laterales y dos postes de sujeción
function base() {
  const out = [];
  out.push(
    S(k.slabOf(BASE, BASE_Z, BASE_TOP - BASE_Z, P, 4, 0.8), {
      tone: "mid",
      inner: L(k.sideSeam(BASE, 14, P, 4), { tone: "faint" }),
    }),
  );
  out.push(L(k.planOutline(k.insetPlan(BASE, 3), BASE_TOP, P, 4), { tone: "faint" }));
  const orejaI = { x: -44, y: -7, w: 14, d: 14, r: 2 };
  const orejaD = { x: 30, y: -7, w: 14, d: 14, r: 2 };
  out.push(S(k.slabOf(orejaI, 13, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(orejaD, 13, 4, P, 3, 0.4), { tone: "mid" }));
  // pletina de la sonda, pegada a la cara visible de la base
  out.push(S(k.slabOf({ x: BASE.x + BASE.w, y: 30, w: 5, d: 8, r: 1 }, 10, 5, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}

function poste(x) {
  const out = [];
  out.push(S(k.cylinder(x, 0, 2.8, 17, INFERIORES[0] - 17, P, 20), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(x, 0, 2.8, 24, P, 12), { tone: "faint" }));
  return out.join("");
}

// Heatpipe: collar soldado y tubo. Los trazos "flow" son las marcas de calor que suben por él.
function tubo([x, y], desde, hasta) {
  const out = [];
  out.push(S(k.cylinder(x, y, 5.6, desde, COLLAR_H, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, TUBO_R, desde + COLLAR_H, hasta - desde - COLLAR_H, P, 24), { tone: "hi", crease: "none" }));
  out.push(L(k.sideArc(x, y, TUBO_R, (desde + hasta) / 2 + 2, P, 14), { tone: "faint" }));
  // marcas de calor sobre la línea de la generatriz que da al observador
  const [cx, cy] = k.towardViewer(P);
  out.push(
    L(k.rise([x + cx * TUBO_R, y + cy * TUBO_R], desde + COLLAR_H, hasta, P), {
      tone: "lit",
      flow: true,
      className: "calor",
    }),
  );
  return out.join("");
}

function aleta(z, extras = "") {
  return S(k.slabOf(ALETA, z, ALETA_E, P, 3, 0.25), { tone: "mid", crease: "faint" }) + extras;
}

function aletasInferiores() {
  const ultima = INFERIORES.length - 1;
  return INFERIORES.map((z, i) => {
    if (i !== ultima) return aleta(z);
    const anillos = TUBOS.map(([x, y]) => k.ring(x, y, 7.2, z + ALETA_E, P, 20)).join("");
    return aleta(z, L(anillos, { tone: "faint" }));
  }).join("");
}

function aletasSuperiores() {
  return SUPERIORES.map((z) => aleta(z)).join("");
}

// Pletina de la sonda y poste de sujeción del cable
function sondaYPoste() {
  const out = [];
  out.push(S(k.cylinder(POSTE[0], POSTE[1], 1.8, 0.6, POSTE_H - 0.6, P, 14), { tone: "mid", crease: "none" }));
  const desde = [BASE.x + BASE.w + 4, 34, 15];
  const hasta = [POSTE[0], POSTE[1], POSTE_H];
  out.push(L(k.segment(desde, hasta, P), { tone: "mid" }));
  out.push(D([en(desde), en(hasta)], { size: 0.8, tone: "hi" }));
  return out.join("");
}

// Ventilador de 120 mm sobre la torre: marco, pared interior, fondo, cubo y aspas
function ventilador() {
  const out = [];
  out.push(S(k.slabOf(VENTILADOR, SUP_TOPE, VENT_TOPE - SUP_TOPE, P, 6, 0.8), { tone: "mid" }));

  const esquinas = k.corners(VENTILADOR, 7);
  out.push(L(esquinas.map(([x, y]) => k.ring(x, y, 2.2, VENT_TOPE, P, 14)).join(""), { tone: "lo" }));
  out.push(D(esquinas.map(([x, y]) => en([x, y, VENT_TOPE])), { size: 0.5 }));

  // pared interior: la elipse del borde, y el fondo desplazado hacia abajo asoma recortado por ella
  const borde = k.ring(0, 0, VENT_R, VENT_TOPE, P, 72);
  out.push(`<clipPath id="ventana"><path d="${borde}"/></clipPath>`);
  out.push(`<path d="${borde}" style="fill:var(--anatomy-shade-0);stroke:none"/>`);

  const plano = k.topMatrix([0, 0], VENT_FONDO, P, "x");
  const aspa =
    "M 10 -2.2 C 18 -12 33 -15 42 -9 C 44.5 -5 43.5 -1 41 2.5 C 32 1.5 19 4.5 10 6.4 Z";
  const aspas = Array.from({ length: ASPAS }, (_, i) => {
    const giro = (360 / ASPAS) * i;
    return `<path transform="rotate(${giro.toFixed(2)})" d="${aspa}" style="fill:var(--anatomy-top);stroke:var(--anatomy-mid);stroke-width:.6;vector-effect:non-scaling-stroke;stroke-linejoin:round"/>`;
  }).join("");
  out.push(
    `<g clip-path="url(#ventana)"><g transform="${plano}">` +
      `<circle r="${VENT_R}" style="fill:var(--anatomy-paper);stroke:none"/>` +
      `<g data-part="aspas"><g transform="scale(${ESC.toFixed(3)})">${aspas}</g></g>` +
      `<circle r="${(10.5 * ESC).toFixed(2)}" style="fill:var(--anatomy-face);stroke:var(--anatomy-mid);stroke-width:.6;vector-effect:non-scaling-stroke"/>` +
      `<circle r="${(7 * ESC).toFixed(2)}" style="fill:none;stroke:var(--anatomy-lo);stroke-width:.6;vector-effect:non-scaling-stroke"/>` +
      `<circle r="1.4" style="fill:var(--anatomy-mid);stroke:none"/>` +
      `</g></g>`,
  );
  out.push(`<path d="${borde}" style="fill:none;stroke:var(--anatomy-mid);stroke-width:.6;stroke-linejoin:round"/>`);
  out.push(L(k.ring(0, 0, VENT_R + 2.2, VENT_TOPE, P, 72), { tone: "lo" }));
  return out.join("");
}

// Regla con marcas de potencia y deslizador (el mando del procesador)
function regla() {
  const out = [];
  out.push(S(k.slabOf(REGLA, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const marcas = k.topTicks(REGLA.x + 4, REGLA.x + REGLA.w - 4, 4, 5, REGLA.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(marcas.minor, { tone: "lo" }), L(marcas.major, { tone: "mid" }));
  out.push(D([en([REGLA.x + 2, REGLA.y + 4.5, 0.6]), en([REGLA.x + REGLA.w - 2, REGLA.y + 4.5, 0.6])], { size: 0.45 }));
  return out.join("");
}

function deslizador() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -11, y: 78, w: 22, d: 21, r: 3 }, DESLIZ_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf({ x: -11, y: 78, w: 22, d: 21, r: 3 }, DESLIZ_Z, DESLIZ_TOPE - DESLIZ_Z, P, 4, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.lineOnTop([0, 78], [0, 99], DESLIZ_TOPE, P), { tone: "hi" }));
  out.push(D([en([-7, 82, DESLIZ_TOPE]), en([7, 82, DESLIZ_TOPE]), en([-7, 95, DESLIZ_TOPE]), en([7, 95, DESLIZ_TOPE])], { size: 0.45 }));
  return out.join("");
}

// Termómetro de sobremesa con pantalla en la cara superior
function termometro() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CAJA, 0, CAJA_H, P)}"/>`];
  out.push(S(k.slabOf(CAJA, 0, CAJA_H, P, 5, 0.8), { tone: "mid" }));
  const ventana = { x: CAJA.x + 6, y: CAJA.y + 6, w: CAJA.w - 12, d: 14, r: 2 };
  out.push(S(k.slabOf(ventana, CAJA_H, 0.6, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(CAJA, 3), CAJA_H, P, 5), { tone: "faint" }));
  out.push(D(k.corners(CAJA, 6).map(([x, y]) => en([x, y, CAJA_H])), { size: 0.45 }));
  const texto = k.faceTextSvg(k.topMatrix([ventana.x + ventana.w / 2, ventana.y + 10.6], CAJA_H + 0.6, P, "x"), "59.0 °C", { size: 7.4, tone: "hi", anchor: "middle" });
  out.push(texto.replace("<text ", '<text data-part="temp" '));
  out.push(L(k.lineOnTop([CAJA.x + 8, CAJA.y + 27], [CAJA.x + 26, CAJA.y + 27], CAJA_H, P), { tone: "lo", free: true }));
  return out.join("");
}

// ------------------------------------------------------------------
// 4. ENSAMBLE (se pinta de atrás hacia adelante y de abajo hacia arriba)
// ------------------------------------------------------------------
const pilasA = atrasAdelante([...TUBOS.map(([x, y]) => ({ x, y, tipo: "tubo" })).map((t) => [t.x, t.y, t]), [-37, 0, { tipo: "poste", x: -37 }], [37, 0, { tipo: "poste", x: 37 }]]);

const tramoA = pilasA
  .map(([, , it]) => (it.tipo === "tubo" ? tubo([it.x, it.y], BASE_TOP, INFERIORES[0]) : poste(it.x)))
  .join("");
const tramoB = atrasAdelante(TUBOS).map((t) => tubo(t, INF_TOPE, SUPERIORES[0])).join("");

const svg = k.figureSvg({
  width: ANCHO,
  height: ALTO,
  label:
    "Un disipador de torre sobre un procesador. Cuatro heatpipes suben el calor desde la base de cobre hasta las aletas de aluminio y un ventilador en la parte superior lo expulsa. Un deslizador sobre una regla fija la potencia del procesador; con ella cambian la corriente, la temperatura de la pantalla del termómetro y la velocidad del ventilador.",
  body: [
    placa(),
    cablePlaca(),
    zocalo(),
    tapa(),
    base(),
    tramoA,
    aletasInferiores(),
    tramoB,
    aletasSuperiores(),
    ventilador(),
    sondaYPoste(),
    regla(),
    `<g data-part="deslizador" transform="${k.translateAlong(P, [DESLIZ_X[1], 0, 0])}">${deslizador()}</g>`,
    termometro(),
  ],
});

// ------------------------------------------------------------------
// 5. VIDA: modelo y animación en la página
// ------------------------------------------------------------------
const vivo = `
const P = ${JSON.stringify(P)};
const VCORE = ${VCORE}, T_AMB = ${T_AMB}, P_MIN = ${P_MIN}, P_MAX = ${P_MAX};
const X_MIN = ${DESLIZ_X[0]}, X_MAX = ${DESLIZ_X[1]};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const deslizador = svg.querySelector('[data-part="deslizador"]');
const aspas = svg.querySelector('[data-part="aspas"]');
const brillo = svg.querySelector('[data-part="brillo"]');
const temp = svg.querySelector('[data-part="temp"]');
const marcas = [...svg.querySelectorAll(".calor")];
const readout = document.querySelector("[data-readout]");
const quieto = matchMedia("(prefers-reduced-motion: reduce)");
const acotar = (v, a, b) => Math.min(b, Math.max(a, v));

// Modelo: resistencia térmica total (K/W) = unión-cápsula + disipador, que baja al subir las rpm
const resistencia = (rpm) => 0.14 + 0.26 * Math.pow(800 / rpm, 0.85);
// Curva del ventilador: sube con la temperatura entre 500 y 2200 rpm
const rpmObjetivo = (tj) => acotar(500 + (tj - 40) * 28, 500, 2200);
const potenciaEn = (x) => P_MIN + ((x - X_MIN) / (X_MAX - X_MIN)) * (P_MAX - P_MIN);
const posicionDe = (w) => X_MIN + ((w - P_MIN) / (P_MAX - P_MIN)) * (X_MAX - X_MIN);

const recorrido = [60, 120, 210, 90].map(posicionDe);
let x = posicionDe(120), meta = x, rpm = 1000, tj = 60, angulo = 0;
let frame = 0, ultimo = 0, reloj = 0, de_gira = !quieto.matches, visible = false, espera = 0;

function dibujar() {
  const w = potenciaEn(x);
  const amperios = w / VCORE;
  deslizador.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  aspas.setAttribute("transform", "rotate(" + angulo.toFixed(1) + ")");
  brillo.style.opacity = (0.18 + 0.82 * (w - P_MIN) / (P_MAX - P_MIN)).toFixed(2);
  const duracion = acotar(1600 * 70 / Math.max(w, 20), 450, 3200);
  marcas.forEach((m) => { m.style.animationDuration = duracion.toFixed(0) + "ms"; });
  temp.textContent = tj.toFixed(1) + " °C";
  const texto = amperios.toFixed(0) + " A · " + w.toFixed(0) + " W · " + tj.toFixed(0) + " °C · " + (Math.round(rpm / 10) * 10) + " rpm";
  if (readout.textContent !== texto) readout.textContent = texto;
  stage.setAttribute("aria-valuenow", String(Math.round(w)));
  stage.setAttribute("aria-valuetext", texto);
}

function paso(ahora) {
  const dt = ultimo ? Math.min((ahora - ultimo) / 1000, 1 / 30) : 1 / 60;
  ultimo = ahora;
  if (de_gira) { reloj += dt; meta = recorrido[Math.floor(reloj / 3.4) % recorrido.length]; }
  x = quieto.matches ? meta : x + (meta - x) * (1 - Math.exp(-dt / 0.35));
  const w = potenciaEn(x);
  const tjIdeal = T_AMB + w * resistencia(rpm);
  tj += (tjIdeal - tj) * (1 - Math.exp(-dt / 1.4));
  rpm += (rpmObjetivo(tj) - rpm) * (1 - Math.exp(-dt / 0.9));
  if (!quieto.matches) angulo = (angulo + dt * (0.4 + rpm / 1000 * 1.6) * 360) % 360;
  dibujar();
  const reposo = quieto.matches && Math.abs(meta - x) < 0.01 && Math.abs(tjIdeal - tj) < 0.05;
  frame = visible && !reposo ? requestAnimationFrame(paso) : 0;
}
const arrancar = () => { if (!frame && visible) { ultimo = 0; frame = requestAnimationFrame(paso); } };
const dirigir = (nuevo) => {
  de_gira = false; meta = acotar(nuevo, X_MIN, X_MAX); clearTimeout(espera);
  espera = setTimeout(() => { de_gira = !quieto.matches; reloj = 0; arrancar(); }, 4200); arrancar();
};
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) arrancar(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (ev) => {
  const caja = svg.getBoundingClientRect();
  const parte = acotar(((ev.clientX - caja.left) / caja.width - 0.1) / 0.8, 0, 1);
  dirigir(X_MIN + parte * (X_MAX - X_MIN));
});
stage.addEventListener("pointerleave", () => dirigir(meta));
stage.addEventListener("keydown", (ev) => {
  const salto = (X_MAX - X_MIN) / 12;
  let nuevo = null;
  if (ev.key === "ArrowRight" || ev.key === "ArrowUp") nuevo = meta + salto;
  if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") nuevo = meta - salto;
  if (ev.key === "Home") nuevo = X_MIN;
  if (ev.key === "End") nuevo = X_MAX;
  if (nuevo === null) return;
  ev.preventDefault();
  dirigir(nuevo);
});
dibujar();
`;

const cuerpo = k.plateHtml({
  fig: "Fig 1",
  title: "Disipador térmico",
  hint: "Pasa el cursor para cambiar la potencia",
  readout: "100 A · 120 W · 60 °C · 1040 rpm",
  keys: [
    { mark: "lit", label: "Tapa del procesador y marcas de calor: de dónde sale y por dónde sube" },
    { mark: "raised", label: "Cuatro heatpipes de cobre entre la base y las aletas" },
  ],
  caption:
    "Toda la potencia eléctrica que consume el procesador acaba como calor (efecto Joule: Q = I² · R · t). La base lo recoge, los heatpipes lo suben a las aletas y el ventilador lo expulsa. Con más potencia, el procesador se calienta, el ventilador acelera y la resistencia térmica del conjunto baja. Valores de un modelo sencillo con un procesador de 1,2 V.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Potencia del procesador: flechas izquierda y derecha mueven el deslizador" aria-valuemin="${P_MIN}" aria-valuemax="${P_MAX}" aria-valuenow="120">${svg}</div>`,
});

escribirPagina("disipador", { title: "Disipador térmico", body: cuerpo, script: vivo });
