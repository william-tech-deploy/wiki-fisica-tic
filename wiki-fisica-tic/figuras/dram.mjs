/**
 * dram.mjs  ·  Figura 3: celdas de memoria DRAM
 * ---------------------------------------------------------------
 * Idea: una celda de DRAM guarda un bit como carga en un micro-condensador
 * (Q = C · V). Esa carga se fuga con el tiempo, así que cada fila de celdas
 * se lee y se vuelve a llenar antes de que baje de la mitad: es el refresco
 * (cada 64 ms en las memorias reales).
 *
 * Qué se ve: cada celda es una probeta con una columna de "carga". Un
 * transistor de acceso la conecta a su línea de palabra (horizontal) y a su
 * línea de bit (vertical). El refresco recorre las filas y rellena las
 * columnas; las celdas más fugadas (τ pequeña) se pierden si el intervalo es
 * demasiado largo.
 *
 * Qué se mueve: un deslizador fija el tiempo entre refrescos (8 a 160 ms).
 * El tiempo está acelerado: 1 ms de la memoria dura 25 ms en pantalla.
 *
 * Uso:  node figuras/dram.mjs
 * ---------------------------------------------------------------
 */
import { k, escribirPagina } from "./comun.mjs";
import { crearPiezas, ordenar, rangoPantalla, VIVO } from "./piezas.mjs";

const ANCHO = 640;
const ALTO = 450;

// ------------------------------------------------------------------
// 1. MODELO (valores ilustrativos de una matriz de 4 × 4 celdas)
// ------------------------------------------------------------------
const FILAS = 4;
const COLS = 4;
// bit guardado en cada celda (fila de atrás hacia adelante, columna de izquierda a derecha)
const BITS = [
  [1, 0, 1, 1],
  [0, 1, 0, 1],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
];
// constante de fuga de cada celda en ms: la carga cae como exp(-t / τ). Hay unas pocas celdas "débiles".
const TAU = [
  [310, 240, 95, 280],
  [260, 300, 220, 150],
  [180, 120, 260, 330],
  [290, 210, 140, 250],
];
const UMBRAL = 0.5; // por debajo de la mitad de la carga, el amplificador ya no distingue un 1
const T_MIN = 8;
const T_MAX = 160;
const T_INICIO = 64;

// ------------------------------------------------------------------
// 2. GEOMETRÍA (unidades del mundo, z hacia arriba)
// ------------------------------------------------------------------
const PLACA = { x: -132, y: -100, w: 264, d: 236, r: 8 };
const CX = [-60, -20, 20, 60];
const CY = [-60, -20, 20, 60];
const PAD_R = 16;
const PAD_H = 2;
const JARRA_R = 12.5;
const COL_R = 9.5;
const COL_H = 30; // altura de la columna a carga completa
const JARRA_H = 33;
const TRANS = { w: 9, d: 9, h: 3 };
const DESV = 19; // el transistor está a +19 de la celda, en x e y

const DECODIF = { x: -124, y: -82, w: 20, d: 170, r: 3 };
const AMPLIF = { x: -52, y: 88, w: 152, d: 14, r: 3 };

const REGLA = { x: -110, y: 112, w: 176, d: 9, r: 1 };
const DESLIZ_X = [-108, 46];
const CAJA = { x: 84, y: 104, w: 46, d: 30, r: 4 };

const P = k.fitProjection(
  [...k.boxCorners(PLACA, -15, 0), ...k.boxCorners({ x: -70, y: -70, w: 140, d: 140 }, 0, 32), ...k.boxCorners(CAJA, 0, 14)],
  ANCHO,
  ALTO,
  { pad: 34, azimuth: 42 },
);

const { en, S, L, D, placaBase, regla, deslizador, pantalla } = crearPiezas(P);
const [vx, vy] = k.towardViewer(P);
const [px, py] = [-vy, vx]; // perpendicular a la mirada: los bordes laterales de un cilindro

// ------------------------------------------------------------------
// 3. PIEZAS
// ------------------------------------------------------------------

// Columna de carga (la parte "lit"): cilindro dentro de la probeta
const columna = (x, y, nivel) =>
  nivel * COL_H < 0.4 ? "" : S(k.cylinder(x, y, COL_R, PAD_H, nivel * COL_H, P, 24), { tone: "hi", lit: true, crease: "none" });

// Probeta de vidrio: bordes laterales, borde superior doble, base y marca del umbral del 50 %
function probeta(x, y) {
  const out = [];
  const z0 = PAD_H;
  const z1 = PAD_H + JARRA_H;
  const lado = (s, a, b) => k.segment([x + s * JARRA_R * px, y + s * JARRA_R * py, a], [x + s * JARRA_R * px, y + s * JARRA_R * py, b], P);
  out.push(L(lado(-1, z0, z1) + lado(1, z0, z1), { tone: "mid" }));
  out.push(L(k.ring(x, y, JARRA_R, z1, P, 36) + k.ring(x, y, JARRA_R - 1.1, z1, P, 36), { tone: "mid" }));
  out.push(L(k.ring(x, y, JARRA_R, z0, P, 36), { tone: "faint" }));
  // marca del umbral: anillo a medio llenado
  out.push(L(k.ring(x, y, JARRA_R, z0 + (JARRA_H - 2) * UMBRAL, P, 36), { tone: "lo", dashed: true }));
  // pequeñas marcas de nivel en el borde izquierdo (cuartos de la columna)
  const marcas = [0.25, 0.75].map((f) => {
    const z = z0 + COL_H * f;
    return k.segment([x - JARRA_R * px, y - JARRA_R * py, z], [x - (JARRA_R - 2.2) * px, y - (JARRA_R - 2.2) * py, z], P);
  });
  out.push(L(marcas.join(""), { tone: "lo" }));
  return out.join("");
}

// Una celda completa: base, columna de carga, probeta, transistor de acceso y aviso de pérdida
function celda(f, c) {
  const x = CX[c];
  const y = CY[f];
  const out = [];
  out.push(S(k.cylinder(x, y, PAD_R, 0, PAD_H, P, 36), { tone: "lo", crease: "none" }));
  out.push(`<g data-columna="${f},${c}">${BITS[f][c] ? columna(x, y, 1) : ""}</g>`);
  out.push(probeta(x, y));
  // transistor de acceso en el cruce de su línea de palabra y su línea de bit
  const tx = x + DESV;
  const ty = y + DESV;
  const plan = { x: tx - TRANS.w / 2, y: ty - TRANS.d / 2, w: TRANS.w, d: TRANS.d, r: 1.5 };
  out.push(S(k.slabOf(plan, 0, TRANS.h, P, 3, 0.3), { tone: "mid", crease: "faint" }));
  out.push(L(k.lineOnTop([plan.x + 2, ty], [plan.x + plan.w - 2, ty], TRANS.h, P), { tone: "hi" }));
  // conexión del transistor con la placa inferior del condensador
  const a = [tx - TRANS.w / 2, ty - TRANS.d / 2, 1.2];
  const b = [x + PAD_R * 0.72, y + PAD_R * 0.72, PAD_H];
  out.push(L(k.segment(a, b, P), { tone: "mid" }));
  out.push(D([en(b)], { size: 0.7, tone: "hi" }));
  // aviso de celda perdida: una equis sobre la base (solo se ve cuando se pierde el dato)
  const e = 7;
  out.push(
    `<g data-perdida="${f},${c}" style="opacity:0">${L(
      k.lineOnTop([x - e, y - e], [x + e, y + e], PAD_H + 0.1, P) + k.lineOnTop([x - e, y + e], [x + e, y - e], PAD_H + 0.1, P),
      { tone: "hi" },
    ).replace("<path ", '<path style="stroke-width:1.6" ')}</g>`,
  );
  return out.join("");
}

// Líneas de palabra (horizontales) y de bit (verticales) sobre la superficie
function lineas() {
  const z = 0.6;
  const out = [];
  const xFin = CX[COLS - 1] + DESV + 8;
  // de bit: una por columna, hasta el amplificador de lectura
  const bits = CX.map((cx) => k.segment([cx + DESV, CY[0] - 22, z], [cx + DESV, AMPLIF.y, z], P)).join("");
  out.push(L(bits, { tone: "lo" }));
  // de palabra: una por fila, desde el decodificador
  CY.forEach((cy, f) => {
    out.push(
      `<g data-palabra="${f}">${L(k.segment([DECODIF.x + DECODIF.w, cy + DESV, z], [xFin, cy + DESV, z], P), { tone: "mid" })}</g>`,
    );
  });
  out.push(D(CY.map((cy) => en([xFin, cy + DESV, z])), { size: 0.6, tone: "mid" }));
  out.push(D(CX.map((cx) => en([cx + DESV, CY[0] - 22, z])), { size: 0.6, tone: "lo" }));
  return out.join("");
}

// Decodificador de filas (izquierda) con un excitador por línea de palabra
function decodificador() {
  const out = [];
  out.push(S(k.slabOf(DECODIF, 0, 3, P, 4, 0.4), { tone: "mid", crease: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(DECODIF, 2.5), 3, P, 4), { tone: "faint" }));
  CY.forEach((cy) => {
    const plan = { x: DECODIF.x + 3, y: cy + DESV - 4, w: 14, d: 8, r: 1.5 };
    out.push(S(k.slabOf(plan, 3, 2.5, P, 3, 0.3), { tone: "hi", crease: "lo" }));
    out.push(D([en([plan.x + 3, plan.y + 4, 5.5]), en([plan.x + 11, plan.y + 4, 5.5])], { size: 0.4 }));
  });
  return out.join("");
}

// Amplificadores de lectura (delante): uno por columna de bits
function amplificadores() {
  const out = [];
  out.push(S(k.slabOf(AMPLIF, 0, 3, P, 4, 0.4), { tone: "mid", crease: "faint" }));
  out.push(L(k.planOutline(k.insetPlan(AMPLIF, 2.5), 3, P, 4), { tone: "faint" }));
  CX.forEach((cx) => {
    const plan = { x: cx + DESV - 6, y: AMPLIF.y + 2.5, w: 12, d: 9, r: 1.5 };
    out.push(S(k.slabOf(plan, 3, 2.5, P, 3, 0.3), { tone: "hi", crease: "lo" }));
    out.push(L(k.lineOnTop([plan.x + 2, plan.y + 4.5], [plan.x + plan.w - 2, plan.y + 4.5], 5.5, P), { tone: "lo" }));
  });
  return out.join("");
}

// ------------------------------------------------------------------
// 4. ENSAMBLE
// ------------------------------------------------------------------
const celdas = [];
for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) celdas.push({ pos: [CX[c], CY[f]], svg: celda(f, c) });

const svg = k.figureSvg({
  width: ANCHO,
  height: ALTO,
  label:
    "Una matriz de dieciséis celdas de memoria DRAM, cada una una probeta con una columna que representa su carga eléctrica. Un transistor de acceso conecta cada celda a una línea de palabra y a una línea de bit. Un deslizador fija cada cuántos milisegundos se refresca la memoria: con intervalos largos la carga de las celdas más débiles baja de la mitad y el dato se pierde.",
  body: [
    placaBase(PLACA),
    decodificador(),
    amplificadores(),
    lineas(),
    regla(REGLA),
    ...ordenar(P, celdas, (it) => it.pos).map((it) => it.svg),
    `<g data-part="deslizador" transform="${k.translateAlong(P, [DESLIZ_X[1], 0, 0])}">${deslizador(REGLA.y - 6)}</g>`,
    pantalla(CAJA, "64 ms", "tiempo"),
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
const FILAS = ${FILAS}, COLS = ${COLS}, UMBRAL = ${UMBRAL}, T_MIN = ${T_MIN}, T_MAX = ${T_MAX};
const BITS = ${JSON.stringify(BITS)}, TAU = ${JSON.stringify(TAU)};
const CX = ${JSON.stringify(CX)}, CY = ${JSON.stringify(CY)};
const PAD_H = ${PAD_H}, COL_R = ${COL_R}, COL_H = ${COL_H};
const X_MIN = ${DESLIZ_X[0]}, X_MAX = ${DESLIZ_X[1]};
const ESCALA = 40; // milisegundos de la memoria que pasan por cada segundo de pantalla
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const deslizador = svg.querySelector('[data-part="deslizador"]');
const tiempo = svg.querySelector('[data-part="tiempo"]');
const readout = document.querySelector("[data-readout]");
const columnas = {}, perdidas = {}, palabras = [];
svg.querySelectorAll("[data-columna]").forEach((g) => { columnas[g.dataset.columna] = g; });
svg.querySelectorAll("[data-perdida]").forEach((g) => { perdidas[g.dataset.perdida] = g; });
svg.querySelectorAll("[data-palabra]").forEach((g) => { palabras[Number(g.dataset.palabra)] = g.querySelector("path"); });

const intervaloEn = (x) => T_MIN + ((x - X_MIN) / (X_MAX - X_MIN)) * (T_MAX - T_MIN);
const posicionDe = (t) => X_MIN + ((t - T_MIN) / (T_MAX - T_MIN)) * (X_MAX - X_MIN);
const tauDebil = Math.min(...TAU.flatMap((fila, f) => fila.filter((_, c) => BITS[f][c])));
const matriz = (v) => BITS.map((fila) => fila.map(() => v));

let tSim = 0, tReal = 0, nivel, vis, perdida, proximo, activa = [0, 0, 0, 0], ultimaEscritura = 0, tRef = ${T_INICIO};
const tonoActual = [null, null, null, null];

function escribir(T) {
  nivel = BITS.map((fila) => fila.map((b) => (b ? 1 : 0)));
  perdida = matriz(false);
  proximo = [0, 1, 2, 3].map((f) => tSim + ((f + 0.5) * T) / FILAS);
  ultimaEscritura = tReal;
  tRef = T;
}
escribir(tRef);
vis = nivel.map((fila) => fila.slice());
const dibujado = matriz(-1);

function avanzar(dt, x, quietoAhora) {
  const T = intervaloEn(x);
  if (quieto.matches) {
    // Sin animación se dibuja el peor momento de cada celda, justo antes de su refresco:
    // el nivel que le queda es exp(-T / τ) y, si baja de la mitad, el dato se ha perdido.
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
      if (!BITS[f][c]) continue;
      const q = Math.exp(-T / TAU[f][c]);
      perdida[f][c] = q < UMBRAL;
      nivel[f][c] = perdida[f][c] ? 0 : q;
    }
  } else if (!quietoAhora) {
    tReal += dt;
    const ds = dt * ESCALA;
    tSim += ds;
    for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
      if (BITS[f][c] && !perdida[f][c]) nivel[f][c] *= Math.exp(-ds / TAU[f][c]);
    }
    for (let f = 0; f < FILAS; f++) {
      if (tSim >= proximo[f]) {
        for (let c = 0; c < COLS; c++) {
          if (!BITS[f][c] || perdida[f][c]) continue;
          if (nivel[f][c] < UMBRAL) { perdida[f][c] = true; nivel[f][c] = 0; } else nivel[f][c] = 1;
        }
        proximo[f] = tSim + T;
        activa[f] = 0.5;
      } else proximo[f] = Math.min(proximo[f], tSim + T);
      activa[f] = Math.max(0, activa[f] - dt);
    }
    if (tReal - ultimaEscritura > 11 || Math.abs(T - tRef) > 25) escribir(T);
  }

  deslizador.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  let errores = 0;
  for (let f = 0; f < FILAS; f++) for (let c = 0; c < COLS; c++) {
    if (!BITS[f][c]) continue;
    const objetivo = nivel[f][c];
    vis[f][c] = objetivo < vis[f][c] ? objetivo : vis[f][c] + (objetivo - vis[f][c]) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(vis[f][c] - dibujado[f][c]) > 0.004) {
      dibujado[f][c] = vis[f][c];
      columnas[f + "," + c].innerHTML = vis[f][c] * COL_H < 0.4 ? "" : solidSvg(cylinder(CX[c], CY[f], COL_R, PAD_H, vis[f][c] * COL_H, P, 24), { tone: "hi", lit: true, crease: "none" });
    }
    if (perdida[f][c]) errores++;
    perdidas[f + "," + c].style.opacity = perdida[f][c] ? "1" : "0";
  }
  palabras.forEach((p, f) => {
    const tono = activa[f] > 0 ? "lit" : "mid";
    if (tonoActual[f] !== tono) { tonoActual[f] = tono; p.setAttribute("data-tone", tono); }
  });

  const peor = Math.exp(-T / tauDebil) * 100;
  tiempo.textContent = T.toFixed(0) + " ms";
  const texto = "refresco cada " + T.toFixed(0) + " ms · peor celda " + peor.toFixed(0) + " % · " + errores + (errores === 1 ? " error" : " errores");
  if (readout.textContent !== texto) readout.textContent = texto;
  stage.setAttribute("aria-valuenow", String(Math.round(T)));
  stage.setAttribute("aria-valuetext", texto);
  return false;
}

crearVivo({
  stage, svg, xMin: X_MIN, xMax: X_MAX, inicio: posicionDe(${T_INICIO}),
  tour: [64, 130, 32, 100, 150, 48].map(posicionDe), tourSeg: 5,
  pantalla: ${JSON.stringify(pantallaX)}, avanzar,
});
`;

const cuerpo = k.plateHtml({
  fig: "Fig 3",
  title: "Memoria DRAM",
  hint: "Pasa el cursor para cambiar el refresco",
  readout: "refresco cada 64 ms · peor celda 51 % · 0 errores",
  keys: [
    { mark: "lit", label: "Columna de carga de cada celda y línea de palabra que se está refrescando" },
    { mark: "raised", label: "Transistor de acceso, decodificador de filas y amplificadores de lectura" },
  ],
  caption:
    "Cada celda guarda un bit como carga en un micro-condensador (Q = C · V). Una celda de ejemplo (εr = 25, 0,1 µm², 5 nm, 1,1 V) tiene unos 4,4 fF y guarda unos 30 000 electrones. La carga se fuga con el tiempo; el refresco recorre las filas y vuelve a llenar las celdas antes de que bajen de la mitad (línea de puntos), porque entonces el amplificador ya no distingue un 1 de un 0. Las memorias reales refrescan cada 64 ms. Con un intervalo más largo, las celdas con más fuga se pierden y aparece una equis. El tiempo va acelerado y las constantes de fuga son ilustrativas.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Tiempo entre refrescos: flechas izquierda y derecha mueven el deslizador" aria-valuemin="${T_MIN}" aria-valuemax="${T_MAX}" aria-valuenow="${T_INICIO}">${svg}</div>`,
});

escribirPagina("dram", { title: "Memoria DRAM", body: cuerpo, script: vivo });
