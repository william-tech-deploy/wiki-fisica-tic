/**
 * server.js
 * ---------------------------------------------------------------
 * Servidor Express de PhysicTIC Wiki.
 *  - Expone la API REST (solo lectura).
 *  - Sirve el frontend estático de la carpeta /public.
 * ---------------------------------------------------------------
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();

// Las plataformas de despliegue asignan el puerto en process.env.PORT
const PORT = process.env.PORT || 3000;

// --- Middlewares ---
app.use(cors());                                            // permite peticiones de otros orígenes
app.use(express.json());                                    // lee cuerpos JSON
app.use(express.static(path.join(__dirname, 'public')));    // sirve el frontend

/**
 * GET /api/relaciones
 * Devuelve las relaciones ley <-> componente ya unidas.
 * Parámetros opcionales:
 *   busqueda  texto buscado en ley, componente y principio aplicado
 *   categoria categoría exacta de la ley ("Todas" no filtra)
 */
app.get('/api/relaciones', (req, res) => {
  const { busqueda, categoria } = req.query;

  // "WHERE 1=1" permite añadir condiciones con AND sin casos especiales
  let query = `
    SELECT
      r.id AS relacion_id,
      l.nombre AS ley_nombre,
      l.formula AS ley_formula,
      l.categoria AS ley_categoria,
      l.descripcion AS ley_descripcion,
      h.nombre AS hardware_nombre,
      h.categoria AS hardware_categoria,
      h.descripcion_tecnica AS hardware_descripcion,
      r.principio_aplicacion,
      r.impacto_ingenieria
    FROM relaciones_fisica_hardware r
    INNER JOIN leyes_fisicas l ON r.ley_id = l.id
    INNER JOIN componentes_hardware h ON r.hardware_id = h.id
    WHERE 1=1
  `;
  const params = [];

  if (busqueda) {
    query += ` AND (l.nombre LIKE ? OR h.nombre LIKE ? OR r.principio_aplicacion LIKE ?)`;
    const comodin = `%${busqueda}%`;
    params.push(comodin, comodin, comodin);
  }

  if (categoria && categoria !== 'Todas') {
    query += ` AND l.categoria = ?`;
    params.push(categoria);
  }

  query += ` ORDER BY l.nombre ASC`;

  // Los valores van como parámetros (?), nunca pegados al SQL: evita inyección SQL
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar la base de datos', detalle: err.message });
    }
    res.json(rows);
  });
});

/**
 * GET /api/categorias
 * Categorías de física disponibles, sin repetir, para el selector de filtro.
 */
app.get('/api/categorias', (req, res) => {
  db.all(`SELECT DISTINCT categoria FROM leyes_fisicas ORDER BY categoria ASC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar la base de datos', detalle: err.message });
    }
    res.json(rows.map((r) => r.categoria));
  });
});

// --- Arranque ---
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT} (http://localhost:${PORT})`);
});
