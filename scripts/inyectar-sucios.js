const fs = require('node:fs');
const path = require('node:path');

const { stringify } = require('csv-stringify/sync');

const archivo = path.join(
  __dirname,
  '..',
  'data',
  'raw',
  'eventos.csv'
);

if (!fs.existsSync(archivo)) {
  throw new Error('Genera tráfico primero');
}

const filas = [
  {
    fecha: '',
    id: 'prueba-1',
    metodo: 'GET',
    ruta: '/api/clientes',
    status: '200',
    duracion_ms: '4'
  },
  {
    fecha: '2026-09-28T12:00:00Z',
    id: 'prueba-2',
    metodo: 'GTE',
    ruta: '/api/clientes',
    status: '200',
    duracion_ms: '4'
  },
  {
    fecha: '2026-09-28T12:00:00Z',
    id: 'prueba-3',
    metodo: 'GET',
    ruta: '/api/clientes',
    status: 'ABC',
    duracion_ms: '4'
  },
  {
    fecha: '2026-09-28T12:00:00Z',
    id: 'prueba-4',
    metodo: 'GET',
    ruta: '/api/clientes',
    status: '200',
    duracion_ms: '-7'
  }
];

fs.appendFileSync(
  archivo,
  stringify(filas, {
    header: false,
    columns: [
      'fecha',
      'id',
      'metodo',
      'ruta',
      'status',
      'duracion_ms'
    ]
  })
);

console.log(
  'Se agregaron cuatro filas de prueba a',
  archivo
);