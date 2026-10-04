const fs = require('node:fs');
const path = require('node:path');

const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const entrada = path.resolve(
  process.argv[2] ||
    path.join(__dirname, '..', 'data', 'raw', 'eventos.csv')
);

const salida = path.resolve(
  process.argv[3] ||
    path.join(__dirname, '..', 'data', 'reports', 'reporte_batch.csv')
);

if (!fs.existsSync(entrada)) {
  throw new Error('No existe: ' + entrada);
}

const filas = parse(fs.readFileSync(entrada, 'utf8'), {
  columns: true,
  skip_empty_lines: true
});

const contar = (campo) =>
  filas.reduce((a, f) => {
    const clave = f[campo] || 'VACIO';
    a[clave] = (a[clave] || 0) + 1;
    return a;
  }, {});

const tiempos = filas
  .map((f) => Number(f.duracion_ms))
  .filter((n) => Number.isFinite(n) && n >= 0)
  .sort((a, b) => a - b);

const promedio = tiempos.length
  ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length
  : 0;

const p95 = tiempos.length
  ? tiempos[Math.ceil(tiempos.length * 0.95) - 1]
  : 0;

const resumen = [
  {
    grupo: 'general',
    nombre: 'eventos',
    valor: filas.length
  },
  {
    grupo: 'general',
    nombre: 'promedio_ms',
    valor: promedio.toFixed(2)
  },
  {
    grupo: 'general',
    nombre: 'p95_ms',
    valor: p95.toFixed(2)
  }
];

for (const campo of ['metodo', 'status', 'ruta']) {
  for (const [nombre, valor] of Object.entries(contar(campo))) {
    resumen.push({
      grupo: campo,
      nombre,
      valor
    });
  }
}

fs.mkdirSync(path.dirname(salida), {
  recursive: true
});

fs.writeFileSync(
  salida,
  stringify(resumen, {
    header: true,
    columns: ['grupo', 'nombre', 'valor']
  })
);

console.log(
  `Analizadas ${filas.length} filas; promedio ${promedio.toFixed(2)} ms; p95 ${p95.toFixed(2)} ms`
);

console.log('Reporte:', salida);