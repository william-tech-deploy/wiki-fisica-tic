# PhysicTIC Wiki — Wiki Física para Hardware TIC

Web interactiva que relaciona leyes de la física con los componentes de hardware donde se aplican.
Node.js + Express + SQLite en el servidor; HTML, CSS y JavaScript puro en el navegador.

## Ejecutar en local

Requiere Node.js 18 o superior.

```bash
npm install
npm start
```

Abre http://localhost:3000. La base `fisica_hardware.db` se crea y se llena sola la primera vez.
Para empezar de cero, detén el servidor, borra ese archivo y vuelve a iniciar.

## Estructura

```
├── package.json      dependencias y script de arranque
├── database.js       conexión SQLite, tablas y datos iniciales
├── server.js         API REST y servidor de archivos estáticos
└── public/
    ├── index.html    estructura de la página
    ├── style.css     estilos (tema oscuro)
    └── app.js        lógica del navegador
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/relaciones?busqueda=&categoria=` | Relaciones ley ↔ componente (ambos filtros opcionales) |
| GET | `/api/categorias` | Categorías de física disponibles |

## Publicar gratis en Render

1. Sube el proyecto a GitHub.
2. En Render: New + > Web Service y conecta el repositorio.
3. Build Command: `npm install` — Start Command: `node server.js`.
4. Create Web Service.

Las condiciones de los planes gratuitos cambian: verifícalas en el sitio de cada plataforma.
En servicios gratuitos el disco suele ser temporal; no importa aquí porque los datos se recrean al arrancar.

## Cambios respecto al borrador original

- Textos del semillero completos (en el borrador aparecían cortados) y 2 relaciones nuevas.
- Claves foráneas de SQLite activadas.
- Los datos se escapan antes de mostrarse en la página.
- Corregido: el mensaje «Cargando…» no se ocultaba porque la clase `hidden` solo existía para la ventana modal.
- Cierre de la ventana con la tecla Escape, estilos de foco y respeto a «reducir movimiento».
