/**
 * fisica.js
 * ---------------------------------------------------------------
 * Fórmulas de las calculadoras, como funciones puras (sin tocar la página).
 * Se cargan en el navegador (variable global Fisica) y también se pueden
 * probar desde Node: ver test/fisica.test.js  (npm test).
 *
 * Todas trabajan en unidades del SI salvo que el nombre indique otra cosa.
 * Si un dato no es válido lanzan un Error con un mensaje en español.
 * ---------------------------------------------------------------
 */
const Fisica = (() => {
  const EPSILON_0 = 8.8541878128e-12; // permitividad del vacío, F/m
  const CARGA_E = 1.602176634e-19; // carga del electrón, C
  const J_POR_KWH = 3.6e6;

  const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);

  function exigir(valor, nombre, { positivo = false, noNegativo = false } = {}) {
    if (!esNumero(valor)) throw new Error(`Escribe un número en «${nombre}».`);
    if (positivo && valor <= 0) throw new Error(`«${nombre}» debe ser mayor que cero.`);
    if (noNegativo && valor < 0) throw new Error(`«${nombre}» no puede ser negativo.`);
    return valor;
  }

  /**
   * Efecto Joule:  P = I² · R   y   Q = P · t
   * masaG (opcional): masa de cobre en gramos para estimar cuánto subiría su
   * temperatura si todo el calor se quedara en ella (sin disipador).
   */
  function joule({ corriente, resistencia, tiempo, masaG = null, calorEspecifico = 0.385 }) {
    exigir(corriente, 'Corriente', { noNegativo: true });
    exigir(resistencia, 'Resistencia', { noNegativo: true });
    exigir(tiempo, 'Tiempo', { noNegativo: true });
    const potencia = corriente ** 2 * resistencia;
    const energia = potencia * tiempo;
    let subida = null;
    if (masaG !== null && esNumero(masaG) && masaG > 0) subida = energia / (masaG * calorEspecifico);
    return { potencia, energia, energiaKWh: energia / J_POR_KWH, subida };
  }

  /**
   * Ley de Ohm:  V = I · R.  Deja en null la magnitud que quieres calcular;
   * las otras dos deben ser números.
   */
  function ohm({ tension = null, corriente = null, resistencia = null }) {
    const datos = { tension, corriente, resistencia };
    const vacios = Object.keys(datos).filter((n) => datos[n] === null || datos[n] === undefined || Number.isNaN(datos[n]));
    if (vacios.length !== 1) throw new Error('Deja vacío un solo campo: el que quieres calcular.');
    const falta = vacios[0];
    const nombres = { tension: 'Tensión', corriente: 'Corriente', resistencia: 'Resistencia' };
    for (const n of Object.keys(datos)) if (n !== falta) exigir(datos[n], nombres[n]);

    let { tension: V, corriente: I, resistencia: R } = datos;
    if (falta === 'tension') V = I * R;
    if (falta === 'corriente') {
      if (R === 0) throw new Error('La resistencia no puede ser cero para calcular la corriente.');
      I = V / R;
    }
    if (falta === 'resistencia') {
      if (I === 0) throw new Error('La corriente no puede ser cero para calcular la resistencia.');
      R = V / I;
    }
    return { calculado: falta, tension: V, corriente: I, resistencia: R, potencia: V * I };
  }

  /**
   * Condensador de placas paralelas:  C = ε0 · εr · A / d,  Q = C · V,  E = ½ · C · V²
   * areaUm2 en µm², distNm en nm, tension en V.
   */
  function capacitancia({ epsR, areaUm2, distNm, tension }) {
    exigir(epsR, 'Permitividad relativa', { positivo: true });
    exigir(areaUm2, 'Área', { positivo: true });
    exigir(distNm, 'Separación', { positivo: true });
    exigir(tension, 'Tensión', { noNegativo: true });
    const area = areaUm2 * 1e-12;
    const dist = distNm * 1e-9;
    const C = (EPSILON_0 * epsR * area) / dist;
    const Q = C * tension;
    return { capacitancia: C, carga: Q, energia: 0.5 * C * tension ** 2, electrones: Q / CARGA_E };
  }

  /** Ley de Faraday (módulo):  ε = N · ΔΦ / Δt */
  function faraday({ vueltas, variacionFlujo, tiempo }) {
    exigir(vueltas, 'Vueltas', { positivo: true });
    exigir(variacionFlujo, 'Variación de flujo');
    exigir(tiempo, 'Tiempo', { positivo: true });
    return { tension: (vueltas * Math.abs(variacionFlujo)) / tiempo };
  }

  /**
   * Convertidor reductor (buck) del VRM: rizado de corriente en el inductor.
   *   ciclo D = Vout / Vin      ΔI = (Vin − Vout) · D / (L · f)
   * lUh en µH, fKhz en kHz.
   */
  function rizadoBuck({ vin, vout, lUh, fKhz }) {
    exigir(vin, 'Tensión de entrada', { positivo: true });
    exigir(vout, 'Tensión de salida', { positivo: true });
    exigir(lUh, 'Inductancia', { positivo: true });
    exigir(fKhz, 'Frecuencia', { positivo: true });
    if (vout >= vin) throw new Error('Un reductor necesita que la salida sea menor que la entrada.');
    const D = vout / vin;
    const rizado = ((vin - vout) * D) / (lUh * 1e-6 * fKhz * 1e3);
    return { ciclo: D, rizado };
  }

  return { joule, ohm, capacitancia, faraday, rizadoBuck, constantes: { EPSILON_0, CARGA_E } };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Fisica;
