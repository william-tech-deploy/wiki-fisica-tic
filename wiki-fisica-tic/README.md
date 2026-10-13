# PhysicTIC Wiki — Wiki Física para Hardware TIC

Web interactiva que relaciona leyes de la física con los componentes de hardware donde se aplican.
Node.js + Express + SQLite en el servidor; HTML, CSS y JavaScript puro en el navegador.

Tiene tres vistas (pestañas):

| Vista | Qué hace |
|---|---|
| **Relaciones** | Busca y filtra las leyes físicas y el componente donde se aplican; cada tarjeta abre un análisis de ingeniería. |
| **Componentes animados** | Una figura isométrica animada por componente (disipador, VRM, memoria DRAM y fuente). El botón **Ampliar** abre la figura en grande con la explicación y enlaces a las calculadoras. |
| **Calculadoras** | Joule, Ohm, capacitancia, Faraday y rizado del inductor del VRM. El resultado se actualiza al escribir. |

La pestaña abierta se guarda en la dirección (`#componentes`, `#calculadoras`), así que se puede compartir el enlace.

## Ejecutar en local

Requiere Node.js 18 o superior.

```bash
npm install
npm start
```

Abre http://localhost:3000. La base `fisica_hardware.db` se crea y se llena sola la primera vez.
Para empezar de cero, detén el servidor, borra ese archivo y vuelve a iniciar.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Arranca el servidor. |
| `npm test` | Prueba las fórmulas de las calculadoras y comprueba que las cuatro figuras existen y que su código no tiene errores. |
| `npm run figuras` | Reconstruye las figuras animadas en `public/figuras/`. |

## Estructura

```
├── package.json
├── database.js          conexión SQLite, tablas y datos iniciales
├── server.js            API REST y servidor de archivos estáticos
├── figuras/             código que dibuja las figuras animadas (se ejecuta con Node)
│   ├── build.mjs        reconstruye todas las figuras
│   ├── comun.mjs        página, tema y ajustes comunes de las figuras
│   ├── piezas.mjs       placa, regla, deslizador y motor de animación compartidos
│   ├── disipador.mjs    Fig 1: disipador térmico (efecto Joule)
│   ├── vrm.mjs          Fig 2: regulador de tensión de 4 fases (Ohm y Faraday)
│   ├── dram.mjs         Fig 3: celdas de memoria DRAM (capacitancia)
│   ├── fuente.mjs       Fig 4: transformador de la fuente (Faraday)
│   └── kit/             kit de dibujo isométrico "anatomy" (licencia MIT)
├── public/
│   ├── index.html       estructura de la página y las tres vistas
│   ├── style.css        estilos (tema oscuro)
│   ├── app.js           vista Relaciones
│   ├── vistas.js        pestañas
│   ├── componentes.js   vista Componentes animados y vista ampliada
│   ├── calculadoras.js  interfaz de las calculadoras
│   ├── fisica.js        fórmulas (funciones puras, probadas en test/)
│   └── figuras/         páginas generadas por las figuras (se suben a git)
└── test/
    ├── fisica.test.js
    └── figuras.test.js
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/relaciones?busqueda=&categoria=` | Relaciones ley ↔ componente (ambos filtros opcionales) |
| GET | `/api/categorias` | Categorías de física disponibles |
| GET | `/api/componentes` | Cada componente con sus relaciones, la dirección de su figura y la calculadora de cada ley |

La figura y la calculadora de cada componente se eligen por palabras de su nombre (listas `FIGURAS` y `CALCULADORAS` en `server.js`), así que no hace falta cambiar la base de datos.

## Las figuras animadas

Cada figura es un script de Node que escribe una página HTML autónoma en `public/figuras/`; la web la muestra dentro de un iframe (con `?mini` en las tarjetas). Se dibujan con el kit **anatomy** (carpeta `figuras/kit/`, licencia MIT, de [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy)).

**Importante:** las páginas de `public/figuras/` son archivos generados, pero el servidor las lee del disco y Render solo ejecuta `npm install` al publicar. Después de cambiar una figura, ejecuta `npm run figuras` y **sube también los HTML de `public/figuras/` a git**.

| Figura | Qué mueve el deslizador | Modelo |
|---|---|---|
| Disipador | Potencia del procesador (10 a 250 W) | Q = I² · R · t; temperatura y revoluciones del ventilador |
| VRM | Corriente de carga (15 a 140 A) | Convertidor reductor de 4 fases: fases activas, rizado ΔI y pérdidas I² · R |
| Memoria DRAM | Tiempo entre refrescos (8 a 160 ms) | Carga que se fuga como exp(−t / τ); se pierde el dato por debajo del 50 % |
| Fuente | Frecuencia (25 a 200 kHz) | Φ = V / (4 · f · N): a más frecuencia, menos núcleo |

Las figuras responden al cursor, a las flechas del teclado (Inicio y Fin incluidos), hacen un recorrido automático cuando nadie las toca, se detienen fuera de pantalla y respetan «reducir movimiento».

### Añadir un componente nuevo

1. Copia una figura de `figuras/` (por ejemplo `vrm.mjs`), cámbiale el dibujo y el modelo, y ejecútala con `node figuras/<nombre>.mjs`.
2. Añade `['Palabra del nombre', 'nombre']` a la lista `FIGURAS` de `server.js`.
3. Añade el nombre a la lista de `test/figuras.test.js` si quieres que la prueba la compruebe.
4. Sube el HTML generado a git.

## Calculadoras

Las fórmulas están en `public/fisica.js` (sin tocar la página, probadas con `npm test`) y la interfaz en `public/calculadoras.js`. Para añadir una, agrega un objeto a la lista `CALCULADORAS` con sus campos y una función `calcular`, y su fórmula a `fisica.js` con una prueba en `test/fisica.test.js`.

## Publicar gratis en Render

1. Sube el proyecto a GitHub (incluidos los HTML de `public/figuras/`).
2. En Render: New + > Web Service y conecta el repositorio.
3. Build Command: `npm install` — Start Command: `node server.js`.
4. Create Web Service. Cada `git push` a `main` vuelve a publicar.

Las condiciones de los planes gratuitos cambian: verifícalas en el sitio de cada plataforma. En el plan gratuito el servicio se apaga tras 15 minutos sin visitas y tarda cerca de un minuto en despertar, y el disco es temporal; no importa aquí porque los datos se recrean al arrancar.

## Cambios respecto al borrador original

- Textos del semillero completos (en el borrador aparecían cortados) y 2 relaciones nuevas.
- Claves foráneas de SQLite activadas.
- Los datos se escapan antes de mostrarse en la página.
- Corregido: el mensaje «Cargando…» no se ocultaba porque la clase `hidden` solo existía para la ventana modal.
- Cierre de las ventanas con la tecla Escape, estilos de foco y respeto a «reducir movimiento».
- Pestañas, figuras animadas, vista ampliada y calculadoras.
