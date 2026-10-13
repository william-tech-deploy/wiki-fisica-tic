/**
 * build.mjs: reconstruye todas las figuras animadas (npm run figuras).
 * Cada figura escribe su página en public/figuras/.
 * Añade  --light  para generar también la versión clara.
 */
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const aqui = dirname(fileURLToPath(import.meta.url));
const extra = process.argv.slice(2);
const figuras = readdirSync(aqui).filter((f) => f.endsWith(".mjs") && !["build.mjs", "comun.mjs", "piezas.mjs"].includes(f));
for (const f of figuras) {
  const r = spawnSync(process.execPath, [join(aqui, f), ...extra], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
