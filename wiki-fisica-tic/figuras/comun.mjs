/**
 * comun.mjs
 * ---------------------------------------------------------------
 * Piezas compartidas por las figuras animadas de PhysicTIC Wiki.
 * Las figuras se dibujan con el kit "anatomy" (carpeta kit/, licencia MIT):
 * cada figura es un script de Node que escribe una página HTML autónoma
 * en public/figuras/, la cual la wiki muestra dentro de un iframe.
 * ---------------------------------------------------------------
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const SALIDA = join(AQUI, "..", "public", "figuras");
export const TEMA = process.argv.includes("--light") ? "light" : "dark";

// El kit como texto, para incrustarlo en la página y poder llamarlo mientras se anima
export const kitScript = () => readFileSync(join(AQUI, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");

// Ajustes para que la tarjeta ocupe todo el iframe de la wiki
// Con ?mini en la dirección (tarjetas pequeñas de la wiki) se oculta la leyenda y las esquinas de texto,
// y el dibujo se ajusta al alto del recuadro para que no se corte
const AJUSTE_IFRAME = `<script>if(/[?&]mini/.test(location.search))document.documentElement.classList.add("mini")</script><style>
html,body{background:transparent!important}
.iso-page{width:calc(100% - 16px)!important;margin:8px auto!important}
.iso-figure{margin:0}
html.mini .iso-page{width:100%!important;margin:0!important}
html.mini .iso-legend,html.mini .iso-plate-corner[data-corner="fig"],html.mini .iso-plate-corner[data-corner="hint"]{display:none!important}
html.mini .iso-plate{border-radius:10px;padding:34px 8px 8px}
html.mini .iso-plate-corner[data-corner="readout"]{display:none!important}
html.mini .iso-svg{width:100%!important;height:calc(100vh - 42px)!important}
</style>`;

export function escribirPagina(nombre, { title, body, script }) {
  mkdirSync(SALIDA, { recursive: true });
  const html = k
    .pageHtml({ title, theme: TEMA, body, script: kitScript() + script, width: 760 })
    .replace("</head>", `${AJUSTE_IFRAME}</head>`)
    .replace('<html lang="en">', '<html lang="es">');
  const archivo = join(SALIDA, TEMA === "light" ? `${nombre}-light.html` : `${nombre}.html`);
  writeFileSync(archivo, html);
  console.log("escrito", archivo.replace(join(AQUI, ".."), "."), `(${(html.length / 1024).toFixed(0)} KB)`);
}

// Ordena puntos [x, y, ...] de atrás hacia adelante para pintarlos en orden
export const porProfundidad = (P) => (puntos) =>
  [...puntos].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

export { k };
