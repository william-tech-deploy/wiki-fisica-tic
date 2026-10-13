// Pruebas de las fórmulas de las calculadoras.  Ejecutar con:  npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const Fisica = require('../public/fisica.js');

const cerca = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} no es ≈ ${b}`);

test('Joule: 10 A por 2 Ω durante 60 s', () => {
  const r = Fisica.joule({ corriente: 10, resistencia: 2, tiempo: 60 });
  cerca(r.potencia, 200);
  cerca(r.energia, 12000);
  cerca(r.energiaKWh, 12000 / 3.6e6);
  assert.equal(r.subida, null);
});

test('Joule: subida de temperatura de 100 g de cobre', () => {
  const r = Fisica.joule({ corriente: 10, resistencia: 2, tiempo: 60, masaG: 100 });
  cerca(r.subida, 12000 / (100 * 0.385));
});

test('Joule: rechaza valores negativos y vacíos', () => {
  assert.throws(() => Fisica.joule({ corriente: -1, resistencia: 2, tiempo: 1 }), /negativo/);
  assert.throws(() => Fisica.joule({ corriente: NaN, resistencia: 2, tiempo: 1 }), /número/);
});

test('Ohm: calcula la tensión, la corriente o la resistencia que falta', () => {
  assert.equal(Fisica.ohm({ corriente: 5, resistencia: 2.4 }).tension, 12);
  cerca(Fisica.ohm({ tension: 12, resistencia: 2.4 }).corriente, 5);
  cerca(Fisica.ohm({ tension: 12, corriente: 5 }).resistencia, 2.4);
  cerca(Fisica.ohm({ tension: 12, corriente: 5 }).potencia, 60);
});

test('Ohm: exige dejar un solo campo vacío y evita dividir entre cero', () => {
  assert.throws(() => Fisica.ohm({ tension: 12, corriente: 5, resistencia: 2.4 }), /un solo campo/);
  assert.throws(() => Fisica.ohm({ tension: 12 }), /un solo campo/);
  assert.throws(() => Fisica.ohm({ tension: 12, resistencia: 0 }), /cero/);
  assert.throws(() => Fisica.ohm({ tension: 12, corriente: 0 }), /cero/);
});

test('Capacitancia: celda DRAM de ejemplo da unos 4,4 fF', () => {
  const r = Fisica.capacitancia({ epsR: 25, areaUm2: 0.1, distNm: 5, tension: 1.1 });
  cerca(r.capacitancia, 4.4270939e-15, 1e-6);
  cerca(r.carga, r.capacitancia * 1.1);
  cerca(r.energia, 0.5 * r.capacitancia * 1.21);
  cerca(r.electrones, r.carga / 1.602176634e-19);
});

test('Capacitancia: duplicar la separación divide la capacitancia entre dos', () => {
  const a = Fisica.capacitancia({ epsR: 10, areaUm2: 1, distNm: 4, tension: 1 }).capacitancia;
  const b = Fisica.capacitancia({ epsR: 10, areaUm2: 1, distNm: 8, tension: 1 }).capacitancia;
  cerca(a / b, 2);
});

test('Capacitancia: rechaza separación cero', () => {
  assert.throws(() => Fisica.capacitancia({ epsR: 10, areaUm2: 1, distNm: 0, tension: 1 }), /mayor que cero/);
});

test('Faraday: 100 vueltas, 2 mWb en 1 ms inducen 200 V', () => {
  cerca(Fisica.faraday({ vueltas: 100, variacionFlujo: 2e-3, tiempo: 1e-3 }).tension, 200);
});

test('Faraday: el signo de la variación no cambia el módulo', () => {
  cerca(Fisica.faraday({ vueltas: 10, variacionFlujo: -5e-4, tiempo: 1e-3 }).tension, 5);
  assert.throws(() => Fisica.faraday({ vueltas: 10, variacionFlujo: 1, tiempo: 0 }), /mayor que cero/);
});

test('Rizado buck: 12 V a 1,2 V con 0,22 µH a 500 kHz', () => {
  const r = Fisica.rizadoBuck({ vin: 12, vout: 1.2, lUh: 0.22, fKhz: 500 });
  cerca(r.ciclo, 0.1);
  cerca(r.rizado, (10.8 * 0.1) / (0.22e-6 * 500e3));
});

test('Rizado buck: la salida debe ser menor que la entrada', () => {
  assert.throws(() => Fisica.rizadoBuck({ vin: 5, vout: 5, lUh: 1, fKhz: 100 }), /menor/);
});
