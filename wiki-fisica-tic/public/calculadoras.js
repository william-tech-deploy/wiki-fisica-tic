/**
 * calculadoras.js
 * ---------------------------------------------------------------
 * Interfaz de las calculadoras. Las fórmulas están en fisica.js; aquí solo se
 * definen los campos de cada calculadora, se leen los números y se muestran
 * los resultados.
 *
 * Para añadir una calculadora nueva: agrega un objeto a CALCULADORAS con sus
 * campos y una función calcular(valores) que devuelva una lista de
 * { etiqueta, valor, unidad }.
 * ---------------------------------------------------------------
 */

// Cada campo: id, etiqueta, unidad que ve la persona, valor inicial y factor
// para pasarlo al SI (por ejemplo mΩ → Ω es 1e-3). `opcional` admite dejarlo vacío.
const CALCULADORAS = [
  {
    clave: 'joule',
    titulo: 'Efecto Joule',
    formula: 'P = I² · R   ·   Q = P · t',
    explicacion:
      'Calor que produce una corriente al atravesar una resistencia. Con los valores iniciales (83 A y 14,5 mΩ) sale la potencia de un procesador de unos 100 W. Si indicas una masa de cobre, estima cuánto subiría su temperatura sin disipador.',
    campos: [
      { id: 'corriente', etiqueta: 'Corriente (I)', unidad: 'A', valor: 83 },
      { id: 'resistencia', etiqueta: 'Resistencia (R)', unidad: 'mΩ', valor: 14.5, factor: 1e-3 },
      { id: 'tiempo', etiqueta: 'Tiempo (t)', unidad: 's', valor: 60 },
      { id: 'masa', etiqueta: 'Masa de cobre (opcional)', unidad: 'g', valor: 100, opcional: true },
    ],
    calcular: (v) => {
      const r = Fisica.joule({ corriente: v.corriente, resistencia: v.resistencia, tiempo: v.tiempo, masaG: v.masa });
      const salida = [
        { etiqueta: 'Potencia disipada (P)', valor: r.potencia, unidad: 'W' },
        { etiqueta: 'Calor generado (Q)', valor: r.energia, unidad: 'J' },
        { etiqueta: 'Equivale a', valor: r.energiaKWh, unidad: 'kWh', simple: true },
      ];
      if (r.subida !== null) salida.push({ etiqueta: 'Subida si no hubiera disipador', valor: r.subida, unidad: 'K', simple: true });
      return salida;
    },
  },
  {
    clave: 'ohm',
    titulo: 'Ley de Ohm',
    formula: 'V = I · R',
    explicacion:
      'Deja vacío el campo que quieres calcular y rellena los otros dos. Con los valores iniciales, un raíl de 12 V que atraviesa 2,4 Ω deja pasar 5 A.',
    campos: [
      { id: 'tension', etiqueta: 'Tensión (V)', unidad: 'V', valor: 12, opcional: true },
      { id: 'corriente', etiqueta: 'Corriente (I)', unidad: 'A', valor: null, opcional: true },
      { id: 'resistencia', etiqueta: 'Resistencia (R)', unidad: 'Ω', valor: 2.4, opcional: true },
    ],
    calcular: (v) => {
      const r = Fisica.ohm({ tension: v.tension, corriente: v.corriente, resistencia: v.resistencia });
      const nombres = {
        tension: { etiqueta: 'Tensión (V)', unidad: 'V' },
        corriente: { etiqueta: 'Corriente (I)', unidad: 'A' },
        resistencia: { etiqueta: 'Resistencia (R)', unidad: 'Ω' },
      };
      return [
        { etiqueta: nombres[r.calculado].etiqueta + ' · calculada', valor: r[r.calculado], unidad: nombres[r.calculado].unidad },
        { etiqueta: 'Potencia (V · I)', valor: r.potencia, unidad: 'W' },
      ];
    },
  },
  {
    clave: 'capacitancia',
    titulo: 'Capacitancia (condensador)',
    formula: 'C = ε₀ · εr · A / d   ·   Q = C · V',
    explicacion:
      'Condensador de placas paralelas, como el de una celda de memoria DRAM. Los valores iniciales son de una celda con dieléctrico de permitividad alta (εr = 25). La carga en electrones es lo que distingue un 1 de un 0.',
    campos: [
      { id: 'epsR', etiqueta: 'Permitividad relativa (εr)', unidad: '', valor: 25 },
      { id: 'area', etiqueta: 'Área de las placas (A)', unidad: 'µm²', valor: 0.1 },
      { id: 'dist', etiqueta: 'Separación (d)', unidad: 'nm', valor: 5 },
      { id: 'tension', etiqueta: 'Tensión (V)', unidad: 'V', valor: 1.1 },
    ],
    calcular: (v) => {
      const r = Fisica.capacitancia({ epsR: v.epsR, areaUm2: v.area, distNm: v.dist, tension: v.tension });
      return [
        { etiqueta: 'Capacitancia (C)', valor: r.capacitancia, unidad: 'F' },
        { etiqueta: 'Carga almacenada (Q)', valor: r.carga, unidad: 'C' },
        { etiqueta: 'Energía almacenada', valor: r.energia, unidad: 'J' },
        { etiqueta: 'Electrones en la celda', valor: r.electrones, unidad: 'e⁻', simple: true },
      ];
    },
  },
  {
    clave: 'faraday',
    titulo: 'Ley de Inducción de Faraday',
    formula: 'ε = N · ΔΦ / Δt',
    explicacion:
      'Tensión inducida en una bobina cuando cambia el flujo magnético que la atraviesa, como en el transformador de una fuente de alimentación. Se calcula el módulo; el signo negativo de la ley (ley de Lenz) solo indica que se opone al cambio.',
    campos: [
      { id: 'vueltas', etiqueta: 'Vueltas de la bobina (N)', unidad: '', valor: 40 },
      { id: 'flujo', etiqueta: 'Variación de flujo (ΔΦ)', unidad: 'µWb', valor: 20, factor: 1e-6 },
      { id: 'tiempo', etiqueta: 'Tiempo del cambio (Δt)', unidad: 'µs', valor: 5, factor: 1e-6 },
    ],
    calcular: (v) => {
      const r = Fisica.faraday({ vueltas: v.vueltas, variacionFlujo: v.flujo, tiempo: v.tiempo });
      return [{ etiqueta: 'Tensión inducida (ε)', valor: r.tension, unidad: 'V' }];
    },
  },
  {
    clave: 'vrm',
    titulo: 'Rizado del inductor (VRM)',
    formula: 'D = Vout / Vin   ·   ΔI = (Vin − Vout) · D / (L · f)',
    explicacion:
      'Una fase del regulador de tensión: el inductor se opone a los cambios bruscos de corriente (Faraday) y deja un rizado. Cuanta más inductancia o más frecuencia, menos rizado. Valores iniciales: 12 V a 1,2 V.',
    campos: [
      { id: 'vin', etiqueta: 'Tensión de entrada (Vin)', unidad: 'V', valor: 12 },
      { id: 'vout', etiqueta: 'Tensión de salida (Vout)', unidad: 'V', valor: 1.2 },
      { id: 'l', etiqueta: 'Inductancia (L)', unidad: 'µH', valor: 0.47 },
      { id: 'f', etiqueta: 'Frecuencia de conmutación (f)', unidad: 'kHz', valor: 500 },
    ],
    calcular: (v) => {
      const r = Fisica.rizadoBuck({ vin: v.vin, vout: v.vout, lUh: v.l, fKhz: v.f });
      return [
        { etiqueta: 'Ciclo de trabajo (D)', valor: r.ciclo * 100, unidad: '%', simple: true },
        { etiqueta: 'Rizado de corriente (ΔI)', valor: r.rizado, unidad: 'A' },
      ];
    },
  },
];

// ---------- Formato de números ----------
const PREFIJOS = [
  [1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f'],
];
const numeroEs = new Intl.NumberFormat('es', { maximumSignificantDigits: 4 });

// 4,427e-15 F  →  «4,427 fF». Con `simple` no se usan prefijos del SI.
function formatearResultado(valor, unidad, simple = false) {
  if (!Number.isFinite(valor)) return '—';
  if (simple || valor === 0) return `${numeroEs.format(valor)} ${unidad}`.trim();
  const magnitud = Math.abs(valor);
  const par = PREFIJOS.find(([escala]) => magnitud >= escala * 0.9995) || PREFIJOS[PREFIJOS.length - 1];
  return `${numeroEs.format(valor / par[0])} ${par[1]}${unidad}`.trim();
}

// ---------- Interfaz ----------
let calculadorasMontadas = false;

function leerCampo(campo, entrada) {
  const texto = entrada.value.trim();
  if (texto === '') return campo.opcional ? null : NaN;
  const numero = Number(texto.replace(',', '.'));
  return Number.isFinite(numero) ? numero * (campo.factor || 1) : NaN;
}

function montarCalculadoras() {
  if (calculadorasMontadas) return;
  calculadorasMontadas = true;
  const rejilla = document.getElementById('calcGrid');

  CALCULADORAS.forEach((calc) => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'calc-card';
    tarjeta.id = `calc-${calc.clave}`;

    const cabecera = document.createElement('header');
    const titulo = document.createElement('h3');
    titulo.textContent = calc.titulo;
    const formula = document.createElement('div');
    formula.className = 'formula-tag';
    formula.textContent = calc.formula;
    cabecera.append(titulo, formula);

    const explicacion = document.createElement('p');
    explicacion.className = 'calc-desc';
    explicacion.textContent = calc.explicacion;

    const formulario = document.createElement('form');
    formulario.className = 'calc-form';
    formulario.noValidate = true;
    formulario.addEventListener('submit', (e) => e.preventDefault());

    const entradas = {};
    calc.campos.forEach((campo) => {
      const etiqueta = document.createElement('label');
      const texto = document.createElement('span');
      texto.className = 'calc-etiqueta';
      texto.textContent = campo.etiqueta;
      const caja = document.createElement('span');
      caja.className = 'calc-input';
      const entrada = document.createElement('input');
      entrada.type = 'number';
      entrada.step = 'any';
      entrada.inputMode = 'decimal';
      entrada.id = `calc-${calc.clave}-${campo.id}`;
      if (campo.valor !== null && campo.valor !== undefined) entrada.value = String(campo.valor);
      if (campo.opcional) entrada.placeholder = 'calcular';
      const unidad = document.createElement('span');
      unidad.className = 'calc-unidad';
      unidad.textContent = campo.unidad;
      caja.append(entrada, unidad);
      etiqueta.append(texto, caja);
      formulario.append(etiqueta);
      entradas[campo.id] = entrada;
    });

    const resultados = document.createElement('div');
    resultados.className = 'calc-resultados';
    resultados.setAttribute('aria-live', 'polite');

    function recalcular() {
      const valores = {};
      let hayError = null;
      calc.campos.forEach((campo) => {
        valores[campo.id] = leerCampo(campo, entradas[campo.id]);
        if (Number.isNaN(valores[campo.id]) && !campo.opcional) hayError = hayError || `Escribe un número en «${campo.etiqueta}».`;
      });
      resultados.replaceChildren();
      try {
        if (hayError) throw new Error(hayError);
        calc.calcular(valores).forEach((fila) => {
          const linea = document.createElement('div');
          linea.className = 'calc-fila';
          const nombre = document.createElement('span');
          nombre.textContent = fila.etiqueta;
          const dato = document.createElement('strong');
          dato.textContent = formatearResultado(fila.valor, fila.unidad, fila.simple);
          linea.append(nombre, dato);
          resultados.append(linea);
        });
      } catch (err) {
        const aviso = document.createElement('p');
        aviso.className = 'calc-error';
        aviso.textContent = err.message;
        resultados.append(aviso);
      }
    }
    formulario.addEventListener('input', recalcular);

    tarjeta.append(cabecera, explicacion, formulario, resultados);
    rejilla.append(tarjeta);
    recalcular();
  });
}
