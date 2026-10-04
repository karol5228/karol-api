const fs = require('node:fs');
const path = require('node:path');

const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const base = path.join(__dirname, '..', 'data');

const raw = path.join(base, 'raw', 'eventos.csv');

if (!fs.existsSync(raw)) throw new Error('No existe RAW: ' + raw);

const filas = parse(fs.readFileSync(raw, 'utf8'), {
  columns: true,
  skip_empty_lines: true
});

const validos = [], rechazados = [];

for (const fila of filas) {
  const motivos = [];

  const metodo = String(fila.metodo || '').trim().toUpperCase();
  const status = Number(fila.status);
  const ms = Number(fila.duracion_ms);

  if (!fila.fecha || !Number.isFinite(Date.parse(fila.fecha))) motivos.push('fecha');
  if (!['GET','POST','PUT','DELETE'].includes(metodo)) motivos.push('metodo');
  if (!String(fila.ruta || '').startsWith('/')) motivos.push('ruta');
  if (!fila.status || !Number.isInteger(status) || status < 100 || status > 599)
    motivos.push('status');
  if (fila.duracion_ms === '' || !Number.isFinite(ms) || ms < 0)
    motivos.push('duracion');
  if (!fila.id) motivos.push('id');

  if (motivos.length) {
    rechazados.push({ ...fila, motivo: motivos.join('|') });
  } else {
    validos.push({
      ...fila,
      metodo,
      status: String(status),
      duracion_ms: ms.toFixed(2)
    });
  }
}

function escribir(ruta, datos, columnas) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(
    ruta,
    stringify(datos, {
      header: true,
      columns: columnas
    })
  );
}

const campos = [
  'fecha',
  'id',
  'metodo',
  'ruta',
  'status',
  'duracion_ms'
];

escribir(
  path.join(base, 'processed', 'eventos_validos.csv'),
  validos,
  campos
);

escribir(
  path.join(base, 'processed', 'eventos_rechazados.csv'),
  rechazados,
  [...campos, 'motivo']
);

escribir(
  path.join(base, 'reports', 'calidad.csv'),
  [
    { metrica: 'total', valor: filas.length },
    { metrica: 'validos', valor: validos.length },
    { metrica: 'rechazados', valor: rechazados.length },
    {
      metrica: 'porcentaje_valido',
      valor: filas.length
        ? (100 * validos.length / filas.length).toFixed(2)
        : '0.00'
    }
  ],
  ['metrica', 'valor']
);

console.log({
  total: filas.length,
  validos: validos.length,
  rechazados: rechazados.length
});