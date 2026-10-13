/**
 * fuente.mjs  ·  Figura 4: transformador de una fuente conmutada
 * ---------------------------------------------------------------
 * Idea: el transformador de una fuente de alimentación funciona por inducción
 * (ley de Faraday: ε = N · ΔΦ / Δt). Con la misma tensión y las mismas
 * vueltas, el flujo máximo que debe soportar el núcleo es Φ = V / (4 · f · N):
 * cuanto mayor es la frecuencia, menos flujo, y por tanto menos hierro hace
 * falta. Por eso las fuentes conmutadas trabajan a decenas de kHz y son tan
 * pequeñas; a 50 Hz el mismo núcleo tendría que ser unas 2000 veces mayor
 * que a 100 kHz.
 *
 * Qué se ve: cuatro transformadores de ferrita sobre la placa, dibujados a
 * escala real del área del núcleo (25, 50, 100 y 200 kHz). Cada uno tiene su
 * bobinado primario (muchas vueltas finas) y secundario (pocas vueltas
 * gruesas). Las marcas que recorren el núcleo son el flujo magnético y
 * cambian de sentido en cada semiciclo.
 *
 * Qué se mueve: un deslizador sobre la regla fija la frecuencia (25 a 200 kHz).
 * Se ilumina el transformador que corresponde y la pantalla da el flujo y el
 * área de núcleo necesarios.
 *
 * Uso:  node figuras/fuente.mjs
 * ---------------------------------------------------------------
 */
import { k, escribirPagina } from "./comun.mjs";
import { crearPiezas, ordenar, rangoPantalla, VIVO } from "./piezas.mjs";

const ANCHO = 640;
const ALTO = 380;

// ------------------------------------------------------------------
// 1. MODELO (transformador de una fuente de PC, valores típicos)
// ------------------------------------------------------------------
const V_PRIMARIO = 311; // V, bus de continua tras rectificar 220 V de red
const VUELTAS = 40; // vueltas del primario
const B_MAX = 0.2; // T, inducción máxima de la ferrita sin saturarse
const F_BASE = 25; // kHz del transformador más grande
const PASO_X = 84; // cada paso de 84 en la regla duplica la frecuencia (y separa los transformadores)
const FRECUENCIAS = [25, 50, 100, 200];
// vueltas que se dibujan en cada bobinado (el primario real tiene VUELTAS; aquí se resumen)
const DIBUJO_PRIM = 16;
const DIBUJO_SEC = 6;

// ------------------------------------------------------------------
// 2. GEOMETRÍA (unidades del mundo, z hacia arriba). Cada transformador se dibuja
//    con la forma de la unidad y se escala con s = √(25 / f): el área del núcleo es s².
// ------------------------------------------------------------------
const PLACA = { x: -185, y: -80, w: 370, d: 190, r: 8 };
const G = 1.35; // ampliación común de los cuatro transformadores (no cambia su escala relativa)
const CENTROS = FRECUENCIAS.map((_, i) => -126 + i * PASO_X);
const ESCALAS = FRECUENCIAS.map((f) => G * Math.sqrt(F_BASE / f));

const NUCLEO_H = 14;
const BOB_Z = 17; // altura del bobinado
const BRIDA_Z = 19;

const REGLA = { x: -138, y: 74, w: 276, d: 9, r: 1 };
const DESLIZ_X = [-126, 126];
const CAJA = { x: 138, y: 74, w: 46, d: 30, r: 4 };

const P = k.fitProjection(
  [...k.boxCorners(PLACA, -15, 0), ...k.boxCorners({ x: -172, y: -44, w: 92, d: 88 }, 0, 30), ...k.boxCorners(CAJA, 0, 14)],
  ANCHO,
  ALTO,
  { pad: 30, azimuth: 42 },
);

const { en, S, L, D, placaBase, regla, deslizador, pantalla } = crearPiezas(P);

// ------------------------------------------------------------------
// 3. PIEZAS
// ------------------------------------------------------------------

// Un transformador completo centrado en (cx, 0) y escalado por s
function transformador(cx, s, indice) {
  const out = [];
  const sc = (p) => ({ x: cx + p.x * s, y: p.y * s, w: p.w * s, d: p.d * s, r: (p.r ?? 0) * s });
  const pt = (x, y, z) => [cx + x * s, y * s, z * s];
  const bisel = (v) => v * s;

  // huella serigrafiada sobre la placa
  const huella = sc({ x: -40, y: -33, w: 80, d: 66, r: 3 });
  out.push(S(k.slabOf(huella, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(huella, 2 * s), 0.8, P, 3), { tone: "faint" }));

  // núcleo de ferrita (dos E enfrentadas): patas, yugos y pata central
  const piezas = [
    { p: { x: -32, y: -26, w: 10, d: 52, r: 1.2 } }, // pata izquierda
    { p: { x: 22, y: -26, w: 10, d: 52, r: 1.2 } }, // pata derecha
    { p: { x: -22, y: -26, w: 44, d: 10, r: 1.2 } }, // yugo trasero
    { p: { x: -22, y: 16, w: 44, d: 10, r: 1.2 } }, // yugo delantero
    { p: { x: -5, y: -16, w: 10, d: 32, r: 0.8 } }, // pata central
  ];
  const ordenadas = ordenar(P, piezas, (it) => [cx + (it.p.x + it.p.w / 2) * s, (it.p.y + it.p.d / 2) * s]);
  for (const { p } of ordenadas) {
    const plan = sc(p);
    out.push(S(k.slabOf(plan, 0, NUCLEO_H * s, P, 3, bisel(0.4)), { tone: "mid", crease: "faint" }));
    out.push(L(k.planOutline(k.insetPlan(plan, Math.min(plan.w, plan.d) * 0.16), NUCLEO_H * s, P, 3), { tone: "faint" }));
  }

  // flujo magnético: dos lazos que cruzan la pata central y vuelven por las patas exteriores
  const lazo = (lado) => {
    const pts = [
      pt(0, 15.5, NUCLEO_H + 0.3),
      pt(0, 21, NUCLEO_H + 0.3),
      pt(lado * 27, 21, NUCLEO_H + 0.3),
      pt(lado * 27, -21, NUCLEO_H + 0.3),
      pt(0, -21, NUCLEO_H + 0.3),
      pt(0, -15.5, NUCLEO_H + 0.3),
    ];
    return k.pathOf(pts.map((q) => en(q)));
  };
  out.push(
    `<g data-flujo="${indice}" style="opacity:0">` +
      L(lazo(-1), { tone: "lit", flow: true, className: "flujo" }) +
      L(lazo(1), { tone: "lit", flow: true, className: "flujo" }) +
      `</g>`,
  );

  // carrete (bobbin) y bobinados: primario atrás (finas, muchas vueltas), secundario delante (gruesas, pocas)
  const brida = (y) => sc({ x: -21, y, w: 42, d: 1.2, r: 0.3 });
  const prim = sc({ x: -20, y: -14, w: 40, d: 13.2, r: 0.6 });
  const sec = sc({ x: -20, y: 0.6, w: 40, d: 13.4, r: 0.6 });
  out.push(S(k.slabOf(brida(-15.2), 0, BRIDA_Z * s, P, 2, bisel(0.2)), { tone: "lo", crease: "faint" }));
  out.push(S(k.slabOf(prim, 0, BOB_Z * s, P, 2, bisel(0.3)), { tone: "mid", crease: "faint" }));
  out.push(S(k.slabOf(brida(-0.6), 0, BRIDA_Z * s, P, 2, bisel(0.2)), { tone: "lo", crease: "faint" }));
  out.push(S(k.slabOf(sec, 0, BOB_Z * s, P, 2, bisel(0.3)), { tone: "hi", crease: "faint" }));
  out.push(S(k.slabOf(brida(14), 0, BRIDA_Z * s, P, 2, bisel(0.2)), { tone: "lo", crease: "faint" }));

  // vueltas de cada bobinado, en la cara superior y en la cara lateral visible (+x)
  const vueltas = (y0, y1, n, tono) => {
    const arriba = [];
    const lado = [];
    for (let i = 0; i < n; i++) {
      const y = y0 + ((i + 0.5) / n) * (y1 - y0);
      arriba.push(k.segment(pt(-19.4, y, BOB_Z), pt(19.4, y, BOB_Z), P));
      lado.push(k.segment(pt(20, y, 0.6), pt(20, y, BOB_Z - 0.6), P));
    }
    return L(arriba.join("") + lado.join(""), { tone: tono });
  };
  out.push(vueltas(-13.4, -1.8, DIBUJO_PRIM, "lo")); // primario: muchas vueltas finas
  out.push(vueltas(1.8, 13.4, DIBUJO_SEC, "mid")); // secundario: pocas vueltas gruesas

  // abrazadera metálica sobre la brida central
  out.push(S(k.slabOf(sc({ x: -31, y: -2.2, w: 62, d: 4.4, r: 0.6 }), BRIDA_Z * s, 1.3 * s, P, 2, bisel(0.2)), { tone: "hi", crease: "lo" }));
  out.push(D([en(pt(-28, 0, BRIDA_Z + 1.3)), en(pt(28, 0, BRIDA_Z + 1.3))], { size: Math.max(0.3, 0.5 * s), tone: "lo" }));

  // rótulo con la frecuencia, grabado en la placa delante de la huella
  out.push(
    k.faceTextSvg(k.topMatrix([cx, 52], 0, P, "x"), `${FRECUENCIAS[indice]} kHz`, { size: 5.2, tone: "lo", anchor: "middle" }),
  );
  return `<g data-trafo="${indice}">${out.join("")}</g>`;
}

// ------------------------------------------------------------------
// 4. ENSAMBLE (de atrás hacia adelante: la x crece hacia el observador)
// ------------------------------------------------------------------
const trafos = CENTROS.map((cx, i) => ({ pos: [cx, 0], svg: transformador(cx, ESCALAS[i], i) }));

const svg = k.figureSvg({
  width: ANCHO,
  height: ALTO,
  label:
    "Cuatro transformadores de ferrita de una fuente de alimentación sobre una placa, de mayor a menor tamaño, para frecuencias de 25, 50, 100 y 200 kilohercios. Cada uno tiene un bobinado primario de muchas vueltas finas y un secundario de pocas vueltas gruesas. Un deslizador sobre una regla fija la frecuencia: se ilumina el transformador correspondiente y el flujo magnético recorre su núcleo cambiando de sentido en cada semiciclo.",
  body: [
    placaBase(PLACA),
    regla(REGLA),
    ...ordenar(P, trafos, (it) => it.pos).map((it) => it.svg),
    `<g data-part="deslizador" transform="${k.translateAlong(P, [DESLIZ_X[0] + PASO_X * 2, 0, 0])}">${deslizador(REGLA.y - 6)}</g>`,
    pantalla(CAJA, "100 kHz", "frecuencia"),
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
const V1 = ${V_PRIMARIO}, N1 = ${VUELTAS}, B_MAX = ${B_MAX}, F_BASE = ${F_BASE}, PASO_X = ${PASO_X};
const X_MIN = ${DESLIZ_X[0]}, X_MAX = ${DESLIZ_X[1]};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const deslizador = svg.querySelector('[data-part="deslizador"]');
const frecuencia = svg.querySelector('[data-part="frecuencia"]');
const readout = document.querySelector("[data-readout]");
const trafos = [0, 1, 2, 3].map((i) => svg.querySelector('[data-trafo="' + i + '"]'));
const flujos = [0, 1, 2, 3].map((i) => svg.querySelector('[data-flujo="' + i + '"]'));
// el flujo cambia de sentido en cada semiciclo y va y viene con suavidad
flujos.forEach((g) => g.querySelectorAll(".flujo").forEach((p) => { p.style.animationDirection = "alternate"; p.style.animationTimingFunction = "ease-in-out"; }));

const frecuenciaEn = (x) => F_BASE * Math.pow(2, (x - X_MIN) / PASO_X); // kHz
const posicionDe = (f) => X_MIN + PASO_X * Math.log2(f / F_BASE);
let activo = -1;

function avanzar(dt, x) {
  const f = frecuenciaEn(x);
  const flujo = (V1 / (4 * f * 1e3 * N1)) * 1e6; // µWb
  const area = flujo / B_MAX; // mm² (µWb / T)
  const idx = acotar(Math.round((x - X_MIN) / PASO_X), 0, 3);
  deslizador.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  if (idx !== activo) {
    activo = idx;
    trafos.forEach((t, i) => { t.style.opacity = i === idx ? "1" : "0.42"; });
    flujos.forEach((g, i) => {
      g.style.opacity = i === idx ? "1" : "0";
      g.querySelectorAll(".flujo").forEach((p) => { p.style.animationPlayState = i === idx ? "running" : "paused"; });
    });
  }
  flujos[idx].querySelectorAll(".flujo").forEach((p) => { p.style.animationDuration = (1500 * Math.sqrt(F_BASE / f)).toFixed(0) + "ms"; });
  frecuencia.textContent = f.toFixed(0) + " kHz";
  const texto = f.toFixed(0) + " kHz · flujo máximo " + flujo.toFixed(0) + " µWb · núcleo " + area.toFixed(0) + " mm²";
  if (readout.textContent !== texto) readout.textContent = texto;
  stage.setAttribute("aria-valuenow", String(Math.round(f)));
  stage.setAttribute("aria-valuetext", texto);
  return false;
}

crearVivo({
  stage, svg, xMin: X_MIN, xMax: X_MAX, inicio: posicionDe(100),
  tour: [100, 25, 200, 50, 140].map(posicionDe), tourSeg: 4.2,
  pantalla: ${JSON.stringify(pantallaX)}, avanzar,
});
`;

const cuerpo = k.plateHtml({
  fig: "Fig 4",
  title: "Transformador de la fuente",
  hint: "Pasa el cursor para cambiar la frecuencia",
  readout: "100 kHz · flujo máximo 19 µWb · núcleo 97 mm²",
  keys: [
    { mark: "lit", label: "Flujo magnético por el núcleo: cambia de sentido en cada semiciclo" },
    { mark: "raised", label: "Bobinado primario (muchas vueltas finas) y secundario (pocas vueltas gruesas)" },
  ],
  caption: `La tensión inducida en un bobinado es ε = N · ΔΦ / Δt (ley de Faraday). Con ${V_PRIMARIO} V en el primario y ${VUELTAS} vueltas, el flujo máximo es Φ = V / (4 · f · N); el núcleo, con una inducción máxima de ${String(B_MAX).replace(".", ",")} T, necesita un área Φ / B. Al duplicar la frecuencia, el flujo y el área se reducen a la mitad, así que el transformador encoge. Los cuatro se dibujan a escala. A 50 Hz, la frecuencia de la red, el núcleo sería unas 2000 veces mayor que a 100 kHz. Valores de un modelo sencillo con onda cuadrada.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Frecuencia de trabajo: flechas izquierda y derecha mueven el deslizador" aria-valuemin="25" aria-valuemax="200" aria-valuenow="100">${svg}</div>`,
});

escribirPagina("fuente", { title: "Transformador de la fuente", body: cuerpo, script: vivo });
