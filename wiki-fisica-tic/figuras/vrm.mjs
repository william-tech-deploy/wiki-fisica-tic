/**
 * vrm.mjs  ·  Figura 2: regulador de tensión (VRM) de cuatro fases
 * ---------------------------------------------------------------
 * Idea: el procesador necesita unos 1,2 V y cientos de amperios, pero la
 * fuente entrega 12 V. Cada fase del VRM es un convertidor reductor (buck):
 * dos MOSFET conmutan 12 V muy deprisa y un inductor (ley de Faraday) alisa
 * la corriente. Un condensador de salida termina de suavizar la tensión.
 *
 * Qué se mueve: un deslizador fija la corriente que pide el procesador
 * (15 a 140 A). Con poca carga trabajan pocas fases (como hacen los VRM
 * reales); con mucha, las cuatro. El brillo de cada inductor sigue la
 * corriente que lo atraviesa, en cámara lenta, y las fases se reparten el
 * ciclo para que sus rizados se compensen.
 *
 * Uso:  node figuras/vrm.mjs
 * ---------------------------------------------------------------
 */
import { k, escribirPagina } from "./comun.mjs";
import { crearPiezas, ordenar, rangoPantalla, VIVO } from "./piezas.mjs";

const ANCHO = 640;
const ALTO = 420;

// ------------------------------------------------------------------
// 1. MODELO FÍSICO (convertidor reductor, valores típicos de una placa)
// ------------------------------------------------------------------
const VIN = 12; // V, raíl de la fuente
const VOUT = 1.2; // V, tensión del núcleo
const L_UH = 0.22; // µH por fase
const F_KHZ = 500; // kHz de conmutación
const R_MOHM = 2.3; // mΩ por fase (RDS(on) del MOSFET + resistencia del inductor)
const FASES = 4;
const A_POR_FASE = 30; // una fase más cuando se supera esta corriente por fase
const I_MIN = 15;
const I_MAX = 140;

// ------------------------------------------------------------------
// 2. GEOMETRÍA (unidades del mundo, z hacia arriba)
// ------------------------------------------------------------------
const PLACA = { x: -170, y: -112, w: 320, d: 236, r: 8 };
const LINEAS = [-66, -22, 22, 66]; // y de cada fase

const RAIL_ENT = { x: -142, y: -88, w: 8, d: 176, r: 2 };
const RAIL_SAL = { x: -34, y: -88, w: 8, d: 176, r: 2 };
const RAIL_H = 1.2;
const BUS_X = -128;

const CAP_ENT = { x: -154, r: 7, h: 16 };
const MOS = { x: -122, w: 15, d: 10, h: 3.5 };
const CHOKE = { x: -96, w: 32, d: 30, h: 16 };
const CAP_SAL = { x: -50, r: 3.8, h: 9, sep: 9 };

const ZOCALO = { x: -12, y: -52, w: 104, d: 104, r: 5 };
const ZOCALO_H = 4;
const IHS = { x: 6, y: -34, w: 68, d: 68, r: 3 };
const IHS_Z = 4;
const IHS_H = 5;
const CONTROLADOR = { x: -96, y: -104, w: 24, d: 14, r: 2 };

const REGLA = { x: -120, y: 92, w: 176, d: 9, r: 1 };
const DESLIZ_X = [-108, 44];
const CAJA = { x: 84, y: 84, w: 56, d: 34, r: 4 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLACA, -15, 0),
    ...k.boxCorners(ZOCALO, 0, 20),
    ...k.boxCorners(CAJA, 0, 14),
    ...k.boxCorners({ x: CAP_ENT.x - 8, y: -80, w: 16, d: 160 }, 0, 18),
  ],
  ANCHO,
  ALTO,
  { pad: 34, azimuth: 42 },
);

const { en, S, L, D, placaBase, regla, deslizador, pantalla } = crearPiezas(P);
const [vx, vy] = k.towardViewer(P);

// ------------------------------------------------------------------
// 3. PIEZAS
// ------------------------------------------------------------------

// Pistas de cobre de una fase (sobre la placa). Las de salida llevan marcas de corriente.
function pistas(y, i) {
  const z = 0.6;
  const pista = (...pts) => L(pts.map(([a, b]) => k.segment([a[0], a[1], z], [b[0], b[1], z], P)).join(""), { tone: "mid" });
  const out = [];
  // condensador de entrada → raíl → drenador del MOSFET superior (cruza el bus de control)
  out.push(pista([[CAP_ENT.x + CAP_ENT.r, y], [RAIL_ENT.x, y]]));
  out.push(pista([[RAIL_ENT.x + RAIL_ENT.w, y - 10], [MOS.x, y - 10]]));
  // puntos de conmutación: los dos MOSFET se unen y salen hacia el inductor
  const mx = MOS.x + MOS.w;
  out.push(pista([[mx, y - 7], [mx + 7, y - 7]], [[mx + 7, y - 7], [mx + 7, y + 7]], [[mx + 7, y + 7], [mx, y + 7]], [[mx + 7, y], [CHOKE.x, y]]));
  // bus de control hacia las puertas de los dos MOSFET
  out.push(pista([[BUS_X, y - 4], [MOS.x, y - 4]], [[BUS_X, y + 4], [MOS.x, y + 4]]));
  // salida del inductor → raíl de salida (aquí fluye la corriente)
  const salida = [
    [[CHOKE.x + CHOKE.w, y], [CAP_SAL.x, y]],
    [[CAP_SAL.x, y], [RAIL_SAL.x, y]],
    [[CAP_SAL.x, y - CAP_SAL.sep], [CAP_SAL.x, y + CAP_SAL.sep]],
  ];
  out.push(
    L(salida.map(([a, b]) => k.segment([a[0], a[1], z], [b[0], b[1], z], P)).join(""), {
      tone: "lit",
      flow: true,
      className: "corriente",
    }).replace("<path ", `<path data-fase="${i}" `),
  );
  // raíl de salida → patillas del procesador
  const cpu = [-6, 0, 6].map((dy) => k.segment([RAIL_SAL.x + RAIL_SAL.w, y + dy, z], [ZOCALO.x, y + dy, z], P)).join("");
  out.push(L(cpu, { tone: "mid" }));
  return out.join("");
}

// Raíles de cobre de entrada y de salida
function railes() {
  const out = [];
  out.push(S(k.slabOf(RAIL_ENT, 0, RAIL_H, P, 3, 0.2), { tone: "mid", crease: "none" }));
  out.push(S(k.slabOf(RAIL_SAL, 0, RAIL_H, P, 3, 0.2), { tone: "mid", crease: "none" }));
  out.push(L(k.lineOnTop([RAIL_ENT.x + 4, RAIL_ENT.y + 6], [RAIL_ENT.x + 4, RAIL_ENT.y + RAIL_ENT.d - 6], RAIL_H, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([RAIL_SAL.x + 4, RAIL_SAL.y + 6], [RAIL_SAL.x + 4, RAIL_SAL.y + RAIL_SAL.d - 6], RAIL_H, P), { tone: "faint" }));
  return out.join("");
}

// Controlador PWM y su bus de señal (línea de puntos) hacia las puertas de los MOSFET
function controlador() {
  const out = [];
  const cy = CONTROLADOR.y + CONTROLADOR.d / 2;
  out.push(
    L(
      [
        k.segment([CONTROLADOR.x, cy, 0.6], [BUS_X, cy, 0.6], P),
        k.segment([BUS_X, cy, 0.6], [BUS_X, LINEAS[3] + 4, 0.6], P),
      ].join(""),
      { tone: "lo", dashed: true },
    ),
  );
  out.push(D([en([BUS_X, cy, 0.6]), ...LINEAS.flatMap((y) => [en([BUS_X, y - 4, 0.6]), en([BUS_X, y + 4, 0.6])])], { size: 0.7, tone: "mid" }));
  out.push(S(k.slabOf(CONTROLADOR, 0, 3, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  out.push(D(k.corners(CONTROLADOR, 3).map(([x, y]) => en([x, y, 3])), { size: 0.4 }));
  // patillas del encapsulado en el borde visible
  const patas = Array.from({ length: 5 }, (_, n) => en([CONTROLADOR.x + CONTROLADOR.w, CONTROLADOR.y + 2.5 + n * 2.3, 1.5]));
  out.push(D(patas, { size: 0.35, tone: "lo" }));
  return out.join("");
}

// Condensador cilíndrico con banda de polaridad y marcas de ventilación en la tapa
function condensador(x, y, r, h, vent = true) {
  const out = [];
  out.push(S(k.cylinder(x, y, r, 0, h, P, 24), { tone: "mid", crease: "none" }));
  const ang = (35 * Math.PI) / 180;
  const sx = x + r * (vx * Math.cos(ang) - vy * Math.sin(ang));
  const sy = y + r * (vx * Math.sin(ang) + vy * Math.cos(ang));
  out.push(L(k.rise([sx, sy], 1, h - 1, P), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, r, h - 2.2, P, 12), { tone: "faint" }));
  out.push(L(k.ring(x, y, r * 0.72, h, P, 20), { tone: "faint" }));
  if (vent) out.push(L(k.lineOnTop([x - r * 0.4, y], [x + r * 0.4, y], h, P) + k.lineOnTop([x, y - r * 0.4], [x, y + r * 0.4], h, P), { tone: "faint" }));
  return out.join("");
}

// Pareja de MOSFET (superior e inferior) con su pestaña metálica y patillas
function mosfets(y) {
  const out = [];
  for (const [dy, nombre] of [[-12, "sup"], [2, "inf"]]) {
    const plan = { x: MOS.x, y: y + dy, w: MOS.w, d: MOS.d, r: 1.5 };
    out.push(S(k.slabOf(plan, 0, MOS.h, P, 3, 0.4), { tone: "lo", crease: "faint" }));
    out.push(L(k.lineOnTop([plan.x + 3, plan.y + 2.5], [plan.x + plan.w - 3, plan.y + 2.5], MOS.h, P), { tone: "mid" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 2.2), MOS.h, P, 3), { tone: "faint" }));
    out.push(D([en([plan.x + 3.5, plan.y + plan.d - 2.5, MOS.h]), en([plan.x + MOS.w - 3.5, plan.y + plan.d - 2.5, MOS.h])], { size: 0.45 }));
    if (nombre === "sup") out.push(D([en([plan.x + MOS.w, plan.y + 3, 1.6]), en([plan.x + MOS.w, plan.y + plan.d - 3, 1.6])], { size: 0.4, tone: "lo" }));
  }
  return out.join("");
}

// Inductor (choke): bloque compacto con marcado y un anillo que se ilumina según su corriente
function inductor(y, i) {
  const out = [];
  const plan = { x: CHOKE.x, y: y - CHOKE.d / 2, w: CHOKE.w, d: CHOKE.d, r: 5 };
  out.push(`<path class="iso-halo" d="${k.haloOf(plan, 0, CHOKE.h, P)}"/>`);
  out.push(
    S(k.slabOf(plan, 0, CHOKE.h, P, 6, 0.8), {
      tone: "hi",
      crease: "lo",
      inner: L(k.sideSeam(plan, 6, P, 6), { tone: "faint" }),
    }),
  );
  out.push(L(k.planOutline(k.insetPlan(plan, 3), CHOKE.h, P, 6), { tone: "faint" }));
  out.push(
    `<path data-part="brillo-fase" data-fase="${i}" class="iso-line" data-tone="lit" d="${k.planOutline(k.insetPlan(plan, 1.6), CHOKE.h, P, 6)}" style="stroke-width:1.2;opacity:.2"/>`,
  );
  out.push(
    k.faceTextSvg(k.topMatrix([plan.x + plan.w / 2, y + 2], CHOKE.h, P, "x"), "R22", { size: 5.4, tone: "lo", anchor: "middle" }),
  );
  out.push(D(k.corners(plan, 6.5).map(([x, yy]) => en([x, yy, CHOKE.h])), { size: 0.45 }));
  return out.join("");
}

// Zócalo y tapa del procesador
function procesador() {
  const out = [];
  out.push(S(k.slabOf(ZOCALO, 0, ZOCALO_H, P, 5, 0.6), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(ZOCALO, 3), ZOCALO_H, P), { tone: "faint" }));
  out.push(D(k.corners(ZOCALO, 7).map(([x, y]) => en([x, y, ZOCALO_H])), { size: 0.45 }));
  out.push(S(k.slabOf(IHS, IHS_Z, IHS_H, P, 4, 0.5), { tone: "hi", crease: "lo" }));
  out.push(
    `<path data-part="brillo" class="iso-line" data-tone="lit" d="${k.planOutline(k.insetPlan(IHS, 2), IHS_Z + IHS_H, P, 4)}" style="stroke-width:1.1;opacity:.3"/>`,
  );
  return out.join("");
}

// ------------------------------------------------------------------
// 4. ENSAMBLE (se pinta de atrás hacia adelante y de abajo hacia arriba)
// ------------------------------------------------------------------
const planos = [
  placaBase(PLACA),
  railes(),
  ...LINEAS.map((y, i) => pistas(y, i)),
  controlador(),
  regla(REGLA),
];

// Piezas con volumen, ordenadas por profundidad de su centro
const altas = [];
LINEAS.forEach((y, i) => {
  altas.push({ pos: [CAP_ENT.x, y], svg: condensador(CAP_ENT.x, y, CAP_ENT.r, CAP_ENT.h) });
  altas.push({ pos: [MOS.x + MOS.w / 2, y], svg: mosfets(y) });
  altas.push({ pos: [CHOKE.x + CHOKE.w / 2, y], svg: inductor(y, i) });
  for (const dy of [-CAP_SAL.sep, CAP_SAL.sep]) altas.push({ pos: [CAP_SAL.x, y + dy], svg: condensador(CAP_SAL.x, y + dy, CAP_SAL.r, CAP_SAL.h, false) });
});
altas.push({ pos: [ZOCALO.x + ZOCALO.w / 2, 0], svg: procesador() });
const altasOrdenadas = ordenar(P, altas, (it) => it.pos).map((it) => it.svg);

const svg = k.figureSvg({
  width: ANCHO,
  height: ALTO,
  label:
    "Un regulador de tensión de cuatro fases en una placa base. Cada fase tiene dos MOSFET, un inductor y condensadores de salida, y alimenta al procesador desde el raíl de 12 voltios. Un deslizador sobre una regla fija la corriente que pide el procesador; con poca carga trabajan pocas fases y con mucha trabajan las cuatro, y el brillo de cada inductor sigue su corriente.",
  body: [
    ...planos,
    ...altasOrdenadas,
    `<g data-part="deslizador" transform="${k.translateAlong(P, [DESLIZ_X[1], 0, 0])}">${deslizador(REGLA.y - 6)}</g>`,
    pantalla(CAJA, "85 A", "carga"),
  ],
});

// ------------------------------------------------------------------
// 5. VIDA: modelo y animación en la página
// ------------------------------------------------------------------
const pantallaX = rangoPantalla(P, PLACA, ANCHO);

const vivo =
  VIVO +
  `
const P = ${JSON.stringify(P)};
const VIN = ${VIN}, VOUT = ${VOUT}, L_UH = ${L_UH}, F_KHZ = ${F_KHZ}, R_MOHM = ${R_MOHM};
const FASES = ${FASES}, A_POR_FASE = ${A_POR_FASE}, I_MIN = ${I_MIN}, I_MAX = ${I_MAX};
const X_MIN = ${DESLIZ_X[0]}, X_MAX = ${DESLIZ_X[1]};
const CICLO = VOUT / VIN;
const RIZADO = ((VIN - VOUT) * CICLO) / (L_UH * 1e-6 * F_KHZ * 1e3); // A, rizado de una fase
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const deslizador = svg.querySelector('[data-part="deslizador"]');
const brillos = [...svg.querySelectorAll('[data-part="brillo-fase"]')];
const corrientes = [...svg.querySelectorAll(".corriente")];
const brilloCpu = svg.querySelector('[data-part="brillo"]');
const carga = svg.querySelector('[data-part="carga"]');
const readout = document.querySelector("[data-readout]");

const corrienteEn = (x) => I_MIN + ((x - X_MIN) / (X_MAX - X_MIN)) * (I_MAX - I_MIN);
const posicionDe = (a) => X_MIN + ((a - I_MIN) / (I_MAX - I_MIN)) * (X_MAX - X_MIN);
const CAMARA_LENTA = 1.8; // segundos que dura en pantalla un ciclo de 2 µs

// triángulo del rizado: sube durante el ciclo de trabajo D y baja el resto
const forma = (s) => (s < CICLO ? s / CICLO : (1 - s) / (1 - CICLO));

let reloj = 0, mostradas = 0;

function avanzar(dt, x, quietoAhora) {
  reloj += quietoAhora ? 0 : dt;
  const amperios = corrienteEn(x);
  const activas = acotar(Math.ceil(amperios / A_POR_FASE), 1, FASES);
  const porFase = amperios / activas;
  const perdidas = activas * porFase * porFase * R_MOHM * 1e-3;

  deslizador.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  for (let i = 0; i < FASES; i++) {
    const encendida = i < activas;
    const s = ((reloj / CAMARA_LENTA) + i / activas) % 1;
    const nivel = encendida ? 0.25 + 0.45 * (porFase / 35) + 0.3 * forma(s) : 0;
    brillos[i].style.opacity = encendida ? nivel.toFixed(2) : "0.08";
  }
  corrientes.forEach((c) => {
    const i = Number(c.dataset.fase);
    const encendida = i < activas;
    c.style.opacity = encendida ? "1" : "0.12";
    c.style.animationPlayState = encendida ? "running" : "paused";
    c.style.animationDuration = acotar(1800 * 25 / porFase, 500, 3200).toFixed(0) + "ms";
  });
  brilloCpu.style.opacity = (0.2 + 0.8 * (amperios - I_MIN) / (I_MAX - I_MIN)).toFixed(2);
  carga.textContent = amperios.toFixed(0) + " A";
  const texto = amperios.toFixed(0) + " A · " + activas + (activas === 1 ? " fase · " : " fases · ") + porFase.toFixed(0) + " A/fase · pérdidas " + perdidas.toFixed(1).replace(".", ",") + " W";
  if (readout.textContent !== texto) readout.textContent = texto;
  stage.setAttribute("aria-valuenow", String(Math.round(amperios)));
  stage.setAttribute("aria-valuetext", texto);
  return false;
}

crearVivo({
  stage, svg, xMin: X_MIN, xMax: X_MAX, inicio: posicionDe(85),
  tour: [40, 100, 140, 25, 70].map(posicionDe), tourSeg: 3.6,
  pantalla: ${JSON.stringify(pantallaX)}, avanzar,
});
`;

const coma = (v) => String(v).replace(".", ",");
const rizadoTxt = (((VIN - VOUT) * (VOUT / VIN)) / (L_UH * 1e-6 * F_KHZ * 1e3)).toFixed(1).replace(".", ",");

const cuerpo = k.plateHtml({
  fig: "Fig 2",
  title: "Regulador de tensión (VRM)",
  hint: "Pasa el cursor para cambiar la carga",
  readout: "85 A · 3 fases · 28 A/fase · pérdidas 6,9 W",
  keys: [
    { mark: "lit", label: "Inductores y pistas de salida: brillan y fluyen con la corriente de cada fase" },
    { mark: "raised", label: "Dos MOSFET por fase, un inductor y dos condensadores de salida" },
  ],
  caption: `Cada fase es un convertidor reductor: los MOSFET conmutan los 12 V a ${F_KHZ} kHz y el inductor (ley de Faraday) se opone a los cambios bruscos de corriente. Con ${VIN} V de entrada, ${coma(VOUT)} V de salida y ${coma(L_UH)} µH, el ciclo de trabajo es del 10 % y cada fase deja un rizado de ${rizadoTxt} A. Con poca carga trabajan pocas fases; con mucha, las cuatro, repartidas en el tiempo para que sus rizados se compensen. Las pérdidas son I² · R con ${coma(R_MOHM)} mΩ por fase. El ciclo se muestra en cámara lenta: el real dura 2 µs.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Corriente de carga del procesador: flechas izquierda y derecha mueven el deslizador" aria-valuemin="${I_MIN}" aria-valuemax="${I_MAX}" aria-valuenow="85">${svg}</div>`,
});

escribirPagina("vrm", { title: "Regulador de tensión (VRM)", body: cuerpo, script: vivo });
