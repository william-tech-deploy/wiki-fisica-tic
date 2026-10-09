/**
 * database.js
 * ---------------------------------------------------------------
 * Capa de datos de PhysicTIC Wiki.
 *  - Abre (o crea) la base de datos SQLite en disco.
 *  - Crea las tres tablas del modelo relacional N:M.
 *  - Carga los datos iniciales solo si la base está vacía.
 * ---------------------------------------------------------------
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta del archivo .db (se puede cambiar con la variable de entorno DB_PATH)
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, 'fisica_hardware.db');

// ------------------------------------------------------------------
// 1. DATOS INICIALES (semillero)
// ------------------------------------------------------------------

// Leyes físicas. El orden define su id: 1, 2, 3, 4.
const LEYES = [
  {
    nombre: 'Efecto Joule',
    formula: 'Q = I² · R · t',
    categoria: 'Termodinámica / Electrodinámica',
    descripcion: 'La corriente que fluye a través de un conductor con resistencia disipa energía en forma de calor, proporcional al cuadrado de la corriente, a la resistencia y al tiempo.'
  },
  {
    nombre: 'Ley de Ohm',
    formula: 'V = I · R',
    categoria: 'Electrodinámica',
    descripcion: 'La diferencia de potencial entre dos puntos de un conductor es directamente proporcional a la intensidad de corriente que circula entre ellos; la constante de proporcionalidad es la resistencia.'
  },
  {
    nombre: 'Capacitancia Electrostática (Ley de Gauss)',
    formula: 'C = Q / V = ε · (A / d)',
    categoria: 'Electrostática',
    descripcion: 'Almacenamiento de carga eléctrica entre dos placas conductoras separadas por un dieléctrico; la capacitancia depende de la permitividad, del área de las placas y de su separación.'
  },
  {
    nombre: 'Ley de Inducción de Faraday',
    formula: 'ε = -dΦB / dt',
    categoria: 'Electromagnetismo',
    descripcion: 'La tensión inducida en un circuito es proporcional a la rapidez de cambio del flujo magnético que lo atraviesa; el signo negativo expresa la ley de Lenz.'
  }
];

// Componentes de hardware. Ids: 1, 2, 3, 4.
const COMPONENTES = [
  {
    nombre: 'Módulos de Memoria DRAM',
    categoria: 'Almacenamiento Primario',
    descripcion_tecnica: 'Celdas compuestas por un transistor de paso y un micro-capacitor que almacena la carga que representa un bit; requieren refresco periódico porque la carga se fuga con el tiempo.'
  },
  {
    nombre: 'Módulo Regulador de Tensión (VRM)',
    categoria: 'Alimentación de Placa Base',
    descripcion_tecnica: 'Sistema convertidor Buck DC-DC multifase que reduce los 12 V de la fuente a la baja tensión (cercana a 1 V) que exige el procesador, mediante MOSFET, inductores (chokes) y capacitores.'
  },
  {
    nombre: 'Disipador térmico y Heatpipes',
    categoria: 'Refrigeración',
    descripcion_tecnica: 'Estructuras de cobre y aluminio con fluido bifásico (heatpipes) que transportan el calor desde el procesador hacia aletas disipadoras, donde se evacúa por convección.'
  },
  {
    nombre: 'Fuente de Alimentación (PSU)',
    categoria: 'Alimentación',
    descripcion_tecnica: 'Transforma la corriente alterna (AC) de la red en corriente continua (DC) regulada de 12 V, 5 V y 3,3 V mediante rectificación, conmutación a alta frecuencia y un transformador.'
  }
];

// Relaciones: [ley_id, hardware_id, principio_aplicacion, impacto_ingenieria]
const RELACIONES = [
  [1, 3,
    'Conversión parásita de energía eléctrica en térmica dentro de los transistores a altas frecuencias de conmutación; la potencia que consume el procesador termina como calor.',
    'Define la potencia de diseño térmico (TDP) y obliga a dimensionar la superficie y el flujo de aire del disipador para mantener el chip por debajo de su temperatura máxima.'],
  [2, 2,
    'Cálculo de caídas de tensión y dimensionamiento de la resistencia RDS(on) en los transistores MOSFET y de las pistas de cobre.',
    'Una RDS(on) baja reduce pérdidas y calor; con corrientes de cientos de amperios, unos pocos miliohmios de diferencia marcan la eficiencia y la estabilidad del voltaje del procesador.'],
  [3, 1,
    'Almacenamiento de un bit de información binaria (1 o 0) como presencia o ausencia de carga en un micro-capacitor.',
    'Al reducir el tamaño de las celdas disminuye la capacitancia y hay que refrescar la memoria con frecuencia (del orden de 64 ms), lo que limita densidad, latencia y consumo.'],
  [4, 2,
    'Uso de inductores (chokes) para oponerse a variaciones bruscas de corriente y filtrar el rizado de la tensión de salida.',
    'La inductancia y el número de fases determinan el rizado y la respuesta transitoria ante los cambios de carga del procesador.'],
  [1, 4,
    'Pérdidas de energía térmica en los transformadores y en los transistores de conmutación de la fuente.',
    'Determina la eficiencia (certificaciones 80 PLUS) y la necesidad de ventilación; una fuente menos eficiente desperdicia más energía como calor.'],
  [4, 4,
    'El transformador de alta frecuencia transfiere energía entre bobinados por inducción electromagnética y aísla la red eléctrica del circuito de baja tensión.',
    'Trabajar a alta frecuencia permite núcleos más pequeños y ligeros, y fuentes compactas con aislamiento galvánico seguro.'],
  [3, 2,
    'Banco de capacitores de salida que almacena carga y suaviza la tensión entregada al procesador durante los picos de consumo.',
    'Reduce las caídas de tensión en las transiciones de carga; su capacitancia y su resistencia serie equivalente (ESR) condicionan la estabilidad del regulador.']
];

// ------------------------------------------------------------------
// 2. CONEXIÓN
// ------------------------------------------------------------------
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// ------------------------------------------------------------------
// 3. ESQUEMA RELACIONAL
// ------------------------------------------------------------------
db.serialize(() => {
  // SQLite no aplica claves foráneas por defecto: hay que activarlas
  db.run('PRAGMA foreign_keys = ON');

  // Tabla de leyes físicas
  db.run(`
    CREATE TABLE IF NOT EXISTS leyes_fisicas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      formula TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descripcion TEXT NOT NULL
    )
  `);

  // Tabla de componentes de hardware
  db.run(`
    CREATE TABLE IF NOT EXISTS componentes_hardware (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL,
      descripcion_tecnica TEXT NOT NULL
    )
  `);

  // Tabla intermedia: une una ley con un componente (relación N:M)
  db.run(`
    CREATE TABLE IF NOT EXISTS relaciones_fisica_hardware (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ley_id INTEGER NOT NULL,
      hardware_id INTEGER NOT NULL,
      principio_aplicacion TEXT NOT NULL,
      impacto_ingenieria TEXT NOT NULL,
      FOREIGN KEY (ley_id) REFERENCES leyes_fisicas (id) ON DELETE CASCADE,
      FOREIGN KEY (hardware_id) REFERENCES componentes_hardware (id) ON DELETE CASCADE
    )
  `);

  // Solo sembramos si la base está vacía (evita duplicados al reiniciar)
  db.get('SELECT COUNT(*) AS total FROM leyes_fisicas', (err, row) => {
    if (err) {
      console.error('Error al revisar el semillero:', err.message);
      return;
    }
    if (row && row.total === 0) {
      sembrarDatos();
    }
  });
});

// ------------------------------------------------------------------
// 4. CARGA DE DATOS INICIALES
// ------------------------------------------------------------------
function sembrarDatos() {
  console.log('Sembrando datos técnicos...');

  // serialize() garantiza el orden: primero leyes y componentes, luego relaciones
  db.serialize(() => {
    const stmtLey = db.prepare(
      'INSERT INTO leyes_fisicas (nombre, formula, categoria, descripcion) VALUES (?, ?, ?, ?)'
    );
    LEYES.forEach((l) => stmtLey.run(l.nombre, l.formula, l.categoria, l.descripcion));
    stmtLey.finalize();

    const stmtHard = db.prepare(
      'INSERT INTO componentes_hardware (nombre, categoria, descripcion_tecnica) VALUES (?, ?, ?)'
    );
    COMPONENTES.forEach((c) => stmtHard.run(c.nombre, c.categoria, c.descripcion_tecnica));
    stmtHard.finalize();

    const stmtRel = db.prepare(
      'INSERT INTO relaciones_fisica_hardware (ley_id, hardware_id, principio_aplicacion, impacto_ingenieria) VALUES (?, ?, ?, ?)'
    );
    RELACIONES.forEach((r) => stmtRel.run(r[0], r[1], r[2], r[3]));
    stmtRel.finalize(() => console.log('Semillero cargado correctamente.'));
  });
}

module.exports = db;
