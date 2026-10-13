// Pruebas de las figuras animadas.  Ejecutar con:  npm test
// Comprueban que cada figura que el servidor anuncia existe, que contiene su dibujo y que el
// JavaScript que lleva incrustado no tiene errores de sintaxis. No abren un navegador.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const RAIZ = path.join(__dirname, '..');
const DIR_FIGURAS = path.join(RAIZ, 'public', 'figuras');

// Las claves de figura que anuncia server.js (la lista FIGURAS)
function clavesDelServidor() {
  const codigo = fs.readFileSync(path.join(RAIZ, 'server.js'), 'utf8');
  const bloque = codigo.match(/const FIGURAS = \[([\s\S]*?)\];/);
  assert.ok(bloque, 'No se encontró la lista FIGURAS en server.js');
  return [...bloque[1].matchAll(/'(\w+)'\]/g)].map((m) => m[1]);
}

test('server.js anuncia las cuatro figuras', () => {
  assert.deepEqual(clavesDelServidor().sort(), ['disipador', 'dram', 'fuente', 'vrm']);
});

for (const clave of clavesDelServidor()) {
  test(`figura «${clave}»: existe, tiene su dibujo y su script compila`, () => {
    const archivo = path.join(DIR_FIGURAS, `${clave}.html`);
    assert.ok(fs.existsSync(archivo), `Falta ${clave}.html: ejecuta  npm run figuras  y sube el resultado a git`);
    const html = fs.readFileSync(archivo, 'utf8');
    assert.ok(html.includes('<svg'), 'no contiene el dibujo');
    assert.ok(html.includes('iso-stage'), 'no contiene el escenario interactivo');
    assert.ok(html.includes('data-readout'), 'no contiene la lectura de datos');
    assert.ok(html.includes('role="slider"'), 'el escenario no es accesible con teclado');
    const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.ok(scripts.length > 0, 'no lleva script');
    for (const js of scripts) new vm.Script(js); // lanza un error si hay un fallo de sintaxis
  });
}
